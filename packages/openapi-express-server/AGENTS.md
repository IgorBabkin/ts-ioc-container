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
- Every request gets a child scope tagged `['request', ...operation.tags]`, attached to
  `req.container` and disposed when the response finishes or the connection closes.
- Tags name nothing else. Use them to bind registrations or middleware to a domain:
  `scope((s) => s.hasTag('admin'))`.

## Recipes

### Wire every operation

One application-scoped service owns the Express app: it registers one route per operation, puts
the error handler after them, and starts the server. `applyRoutes` takes the document and the
generated `PAYLOADS` validators; only the current scope is injected:

```typescript
import 'reflect-metadata';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Server } from 'http';
import type { OpenAPIV3 } from 'openapi-types';
import { by, Container, type IContainer, inject, register, Registration as R, scope, select, singleton, SingleToken } from 'ts-ioc-container';
import { ZodError, type ZodType } from 'zod';
import {
  containerMiddleware,
  convertOpenAPIPathToExpress,
  extractRoutes,
  getContainerOrFail,
  type HttpRouteInstance,
  type RouteMetadata,
} from '@ibabkin/openapi-express-server';

interface IAppService {
  applyRoutes(doc: OpenAPIV3.Document, payloadValidators: Record<string, ZodType>): void;
  start(port: number): Server;
}
const IAppServiceToken = new SingleToken<IAppService>('IAppService');

@register(IAppServiceToken, scope((s) => s.hasTag('application')), singleton())
class AppService implements IAppService {
  private readonly app = express().use(express.json());

  constructor(@inject(by(select.scope.current)) private readonly appScope: IContainer) {}

  applyRoutes(doc: OpenAPIV3.Document, payloadValidators: Record<string, ZodType>): void {
    for (const route of extractRoutes(doc)) {
      if (!this.appScope.hasRegistration(route.operationId)) continue; // not implemented yet
      const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
      const path = convertOpenAPIPathToExpress(route.path);
      const validator = payloadValidators[route.operationId];
      this.app[method](path, containerMiddleware(this.appScope, route.tags), (req, res, next) =>
        this.handle(route, validator, req, res, next),
      );
    }
    // Express recognises an error handler by its four parameters, so it must come after the routes.
    this.app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
      res.status(error instanceof ZodError ? 400 : 500).json({ error: error.message });
    });
  }

  start(port: number): Server {
    return this.app.listen(port);
  }

  private async handle(
    route: RouteMetadata,
    validator: ZodType,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const requestScope = getContainerOrFail(req);
      const useCase = requestScope.resolve<HttpRouteInstance>(route.operationId);
      const payload = validator.parse(req);
      const { status = 200, headers = {}, body } = await useCase.handle(payload, requestScope);
      res.status(status).set(headers);
      if (body === undefined) res.end();
      else res.json(body);
    } catch (error) {
      next(error);
    }
  }
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
  .addRegistration(R.fromClass(GetUser))
  .addRegistration(R.fromClass(AppService));

const appService = IAppServiceToken.resolve(container);
appService.applyRoutes(spec as OpenAPIV3.Document, PAYLOADS);
appService.start(3000);
```

Register every use case **before** calling `applyRoutes`: it skips each operation that has nothing
registered under its `operationId` at that moment.

### Request-scoped services

```typescript
import { register, scope, singleton } from 'ts-ioc-container';

@register('ITransaction', scope((s) => s.hasTag('request')), singleton())
class Transaction {}
```

One instance per request, disposed with the request scope. Use `s.hasTag('<tag>')` with an
OpenAPI tag to limit a registration to the operations carrying that tag.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| `hasRegistration(operationId)` is `false` although it was registered | `container.register(key, provider)` is invisible to `hasRegistration` | `@register(operationId)` on the class + `addRegistration(R.fromClass(X))` |
| `DependencyNotFoundError` (`IOC_DEPENDENCY_NOT_FOUND`) for a use case | Key differs from the `operationId` (e.g. capitalised) | Use the `operationId` verbatim |
| `@inject` params are `undefined` | `reflect-metadata` not imported first, or decorator options off | `import 'reflect-metadata'` first; `experimentalDecorators` + `emitDecoratorMetadata` |
| `Container is not provided` | `getContainerOrFail(req)` ran on a route without `containerMiddleware` | Mount `containerMiddleware(container, route.tags)` on the route |
| A `patch` route is registered but types/validator are missing | Generators only cover `get`, `post`, `put`, `delete`; `extractRoutes` also returns `patch`, `options`, `head` | Skip those methods, or use one of the four |
| Operation without `operationId` never gets a route | `extractRoutes` skips it | Give every operation an `operationId` |
| Payload has a `headers` member / is missing empty `params` | `buildPayload(req)` is not the validator projection | Use `PAYLOADS[operationId].parse(req)`; `buildPayload` only when you have no validators |

## Exports

| Export | Does |
| --- | --- |
| `extractRoutes(doc)` | `RouteMetadata[]`: `{ path, method (upper-case), operationId, tags }` per operation with an `operationId` |
| `convertOpenAPIPathToExpress(path)` | `/users/{id}` → `/users/:id` |
| `containerMiddleware(container, tags = [])` | Per-request child scope tagged `['request', ...tags]` on `req.container`, disposed on finish/close |
| `getContainerOrFail(req)` | `req.container` or throws `Container is not provided` |
| `REQUEST_SCOPE_TAG` | `'request'` |
| `buildPayload(req)` | `{ params?, query?, body?, headers? }` without validation |
| types | `RouteMetadata`, `HttpRouteInstance`, `Payload`, `ErrorHandler`, `OpenAPIServerConfig` |

Importing the package augments `Express.Request` with `container: IContainer`.
