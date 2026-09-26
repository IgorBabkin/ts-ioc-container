# @ibabkin/openapi-express-server — guide for AI coding agents

This file ships inside the npm package, so it matches the version installed in `node_modules`.
**Trust it over what you remember**. More detail: `README.md` next to this file. Types: `esm/*.d.ts`.
For the DI container itself read `node_modules/ts-ioc-container/AGENTS.md`: its API changes between
major versions.

This package is small building blocks, **not** a framework: it has no route builder or server
class. You write the loop that registers one Express route per operation (recipe below).

Sibling packages, used together with this one:

- `@ibabkin/openapi-to-server` — `<Op>HttpRoute` interfaces and `IServer`, keyed by `operationId`
- `@ibabkin/openapi-to-zod` — `PAYLOADS` validators, keyed by the same `operationId`

## Model

- Every OpenAPI operation is one **use case**: a class with `handle(payload, scope)`, registered in
  the application container under its `operationId`, verbatim (`getUser`, not `GetUser`).
- Every request gets a child scope of the application scope, tagged
  `['request', ...operation.tags]`, and disposed when the request is done. The use case is resolved
  from it and receives it as `handle`'s second argument.
- Tags name nothing else. Use them to register dependencies per domain: a registration with
  `scope((s) => s.hasTag('admin'))` is resolvable only in requests to operations tagged `admin`.

## Recipes

### Wire every operation

One application-scoped service owns the Express app. Each concern is a small `add*` method run
once right after construction by an `@onConstruct(execute())` hook, so a module can ask for its
own dependencies through `@inject` parameters (see `addRequestLogging`). Modules run in
declaration order, which is Express middleware order: `addErrorHandling` must stay last.
`applyRoutes` fills the router mounted by `addRouting`, one route per operation, with the
generated `PAYLOADS` validators. Only the current scope is constructor-injected.

**Requirements.** The recipe does not define lifecycle hooks; the application is expected to
provide them already (here imported from `./lifecycle`):

| Name | Contract |
| --- | --- |
| `onConstruct(fn: HookType)` | Method decorator declaring a hook under the `onConstruct` key: `hook('onConstruct', fn)` |
| `execute(): HookFn` | Hook that calls the decorated method with its `@inject` parameters resolved: `ctx.invokeMethod({ args: ctx.resolveArgs() })` |
| `OnConstructModule: IContainerModule` | Runs every `onConstruct` hook of each instance the injector constructs, in declaration order (`HookCollector` + `getInjector().onConstructed` + `runInOrder`) |

`ts-ioc-container` ships none of them (see "Lifecycle hooks" in its `AGENTS.md`). If the
application lacks them, add them there once rather than inside this service.

```typescript
import 'reflect-metadata';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Server } from 'http';
import type { OpenAPIV3 } from 'openapi-types';
import { by, Container, type IContainer, inject, register, Registration as R, scope, select, singleton, SingleToken } from 'ts-ioc-container';
import { ZodError, type ZodType } from 'zod';
import {
  convertOpenAPIPathToExpress,
  extractRoutes,
  type HttpRouteInstance,
  REQUEST_SCOPE_TAG,
  type RouteMetadata,
} from '@ibabkin/openapi-express-server';
import { execute, onConstruct, OnConstructModule } from './lifecycle'; // provided by the application

interface ILogger {
  log(message: string): void;
}
const ILoggerToken = new SingleToken<ILogger>('ILogger');

interface IAppService {
  applyRoutes(doc: OpenAPIV3.Document, payloadValidators: Record<string, ZodType>): void;
  start(port: number): Server;
}
const IAppServiceToken = new SingleToken<IAppService>('IAppService');

@register(IAppServiceToken, scope((s) => s.hasTag('application')), singleton())
class AppService implements IAppService {
  private readonly express = express();
  private readonly router = express.Router(); // filled by applyRoutes

  constructor(@inject(by(select.scope.current)) private readonly appScope: IContainer) {}

  // Modules: each runs once, in declaration order, right after construction.
  @onConstruct(execute())
  addJsonParsing(): void {
    this.express.use(express.json());
  }

  @onConstruct(execute())
  addRequestLogging(@inject(by(ILoggerToken)) logger: ILogger): void {
    this.express.use((req, res, next) => {
      logger.log(`${req.method} ${req.path}`);
      next();
    });
  }

  @onConstruct(execute())
  addHealthCheck(): void {
    this.express.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  }

  @onConstruct(execute())
  addRouting(): void {
    this.express.use(this.router);
  }

  // Must stay last: Express hands an error only to error handlers registered after the failing middleware.
  @onConstruct(execute())
  addErrorHandling(): void {
    this.express.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
      res.status(error instanceof ZodError ? 400 : 500).json({ error: error.message });
    });
  }

  applyRoutes(doc: OpenAPIV3.Document, payloadValidators: Record<string, ZodType>): void {
    for (const route of extractRoutes(doc)) {
      if (!this.appScope.hasRegistration(route.operationId)) continue; // not implemented yet
      const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
      const path = convertOpenAPIPathToExpress(route.path);
      const validator = payloadValidators[route.operationId];
      this.router[method](path, (req, res, next) => this.handle(route, validator, req, res, next));
    }
  }

  start(port: number): Server {
    return this.express.listen(port);
  }

  private async handle(
    route: RouteMetadata,
    validator: ZodType,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    // One scope per request, tagged with the operation's tags: registrations bound to a tag
    // (`scope((s) => s.hasTag('admin'))`) are visible to exactly the routes carrying it.
    const requestScope = this.appScope.createScope({ tags: [REQUEST_SCOPE_TAG, ...route.tags] });
    try {
      const useCase = requestScope.resolve<HttpRouteInstance>(route.operationId);
      const payload = validator.parse(req);
      const { status = 200, headers = {}, body } = await useCase.handle(payload, requestScope);
      res.status(status).set(headers);
      if (body === undefined) res.end();
      else res.json(body);
    } catch (error) {
      next(error);
    } finally {
      requestScope.dispose();
    }
  }
}
```

Add a concern by adding a method, not by editing `applyRoutes`:

```typescript
  @onConstruct(execute())
  addCors(@inject(by(ICorsOptionsToken)) options: CorsOptions): void {
    this.express.use(cors(options)); // declare it above addRouting so it runs before the routes
  }
```

Use cases are registered under their `operationId` with the same decorator:

```typescript
import type { GetUserHttpRoute, GetUserPayload, GetUserResponse } from './.generated/operations';

@register('getUser')
class GetUser implements GetUserHttpRoute {
  async handle({ params }: GetUserPayload, requestScope: IContainer): Promise<GetUserResponse> {
    // resolve request-scoped services from requestScope
  }
}
```

Composition root:

```typescript
import { PAYLOADS } from './.generated/validators';
import spec from './.generated/swagger.json' with { type: 'json' };

const container = new Container({ tags: ['application'] })
  .useModule(OnConstructModule) // without it no add* module runs
  .addRegistration(R.fromValue(console).bindTo(ILoggerToken))
  .addRegistration(R.fromClass(GetUser))
  .addRegistration(R.fromClass(AppService));

const appService = IAppServiceToken.resolve(container);
appService.applyRoutes(spec as OpenAPIV3.Document, PAYLOADS);
appService.start(3000);
```

Register every use case **before** calling `applyRoutes`: it skips each operation that has nothing
registered under its `operationId` at that moment.

### Dependencies per request and per route tag

```typescript
import { register, scope, singleton } from 'ts-ioc-container';

// one instance per request, disposed with the request scope
@register('ITransaction', scope((s) => s.hasTag('request')), singleton())
class Transaction {}

// only for operations tagged `admin` in the OpenAPI document
@register('IAuditLog', scope((s) => s.hasTag('admin')), singleton())
class AuditLog {}

@register('deleteUser') // tags: [admin]
class DeleteUser implements DeleteUserHttpRoute {
  async handle(payload: DeleteUserPayload, requestScope: IContainer): Promise<DeleteUserResponse> {
    requestScope.resolve<AuditLog>('IAuditLog'); // DependencyNotFoundError in an operation without the tag
  }
}
```

Add both to the application container (`addRegistration(R.fromClass(AuditLog))`): the scope
rule decides which request scopes receive them.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| An `add*` module never runs (no JSON parsing, no error handling) | The application's `OnConstructModule` not applied, or `reflect-metadata` not imported first | `container.useModule(OnConstructModule)` |
| An error returns Express's HTML 500 page | The error handler is registered before the failing route | Keep `addErrorHandling` the last `@onConstruct` method; routes go into the router `addRouting` mounts |
| `hasRegistration(operationId)` is `false` although it was registered | `container.register(key, provider)` is invisible to `hasRegistration` | `@register(operationId)` on the class + `addRegistration(R.fromClass(X))` |
| `DependencyNotFoundError` (`IOC_DEPENDENCY_NOT_FOUND`) for a use case | Key differs from the `operationId` (e.g. capitalised) | Use the `operationId` verbatim |
| `@inject` params are `undefined` | `reflect-metadata` not imported first, or decorator options off | `import 'reflect-metadata'` first; `experimentalDecorators` + `emitDecoratorMetadata` |
| `DependencyNotFoundError` for a tag-scoped dependency | The operation lacks that tag in the OpenAPI document, or it is resolved from the application scope | Tag the operation; resolve from the request scope passed to `handle` |
| `Container is not provided` | `getContainerOrFail(req)` ran on a route without `containerMiddleware` | Mount `containerMiddleware(container, route.tags)` on the route, or create the scope yourself as in the recipe |
| A `patch` route is registered but types/validator are missing | Generators only cover `get`, `post`, `put`, `delete`; `extractRoutes` also returns `patch`, `options`, `head` | Skip those methods, or use one of the four |
| Operation without `operationId` never gets a route | `extractRoutes` skips it | Give every operation an `operationId` |
| Payload has a `headers` member / is missing empty `params` | `buildPayload(req)` is not the validator projection | Use `PAYLOADS[operationId].parse(req)`; `buildPayload` only when you have no validators |

## Exports

| Export | Does |
| --- | --- |
| `extractRoutes(doc)` | `RouteMetadata[]`: `{ path, method (upper-case), operationId, tags }` per operation with an `operationId` |
| `convertOpenAPIPathToExpress(path)` | `/users/{id}` → `/users/:id` |
| `containerMiddleware(container, tags = [])` | Middleware alternative to the recipe's scope creation: per-request child scope tagged `['request', ...tags]` on `req.container`, disposed on finish/close |
| `getContainerOrFail(req)` | `req.container` or throws `Container is not provided` |
| `REQUEST_SCOPE_TAG` | `'request'` |
| `buildPayload(req)` | `{ params?, query?, body?, headers? }` without validation |
| types | `RouteMetadata`, `HttpRouteInstance`, `Payload`, `ErrorHandler`, `OpenAPIServerConfig` |

Importing the package augments `Express.Request` with `container: IContainer`.
