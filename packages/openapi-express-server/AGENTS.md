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

One application-scoped service registers one Express route per operation. It gets the Express app
and the `PAYLOADS` map from the container, like everything else:

```typescript
import 'reflect-metadata';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
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

const IExpressAppToken = new SingleToken<Express>('IExpressApp');
const IPayloadsToken = new SingleToken<Record<string, ZodType>>('IPayloads');

interface IAppService {
  applyRoutes(doc: OpenAPIV3.Document): void;
}
const IAppServiceToken = new SingleToken<IAppService>('IAppService');

@register(IAppServiceToken, scope((s) => s.hasTag('application')), singleton())
class AppService implements IAppService {
  constructor(
    @inject(by(select.scope.current)) private readonly appScope: IContainer,
    @inject(by(IExpressAppToken)) private readonly app: Express,
    @inject(by(IPayloadsToken)) private readonly payloads: Record<string, ZodType>,
  ) {}

  applyRoutes(doc: OpenAPIV3.Document): void {
    for (const route of extractRoutes(doc)) {
      if (!this.appScope.hasRegistration(route.operationId)) continue; // not implemented yet
      const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
      const path = convertOpenAPIPathToExpress(route.path);
      this.app[method](path, containerMiddleware(this.appScope, route.tags), (req, res, next) =>
        this.handle(route, req, res, next),
      );
    }
  }

  private async handle(route: RouteMetadata, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestScope = getContainerOrFail(req);
      const useCase = requestScope.resolve<HttpRouteInstance>(route.operationId);
      const payload = this.payloads[route.operationId].parse(req);
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

const app = express();
app.use(express.json());

const container = new Container({ tags: ['application'] })
  .addRegistration(R.fromValue(app).bindTo(IExpressAppToken))
  .addRegistration(R.fromValue(PAYLOADS).bindTo(IPayloadsToken))
  .addRegistration(R.fromClass(GetUser))
  .addRegistration(R.fromClass(AppService));

IAppServiceToken.resolve(container).applyRoutes(spec as OpenAPIV3.Document);

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(error instanceof ZodError ? 400 : 500).json({ error: error.message });
});
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
