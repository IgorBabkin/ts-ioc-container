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

```typescript
import 'reflect-metadata';
import express, { type Express } from 'express';
import type { OpenAPIV3 } from 'openapi-types';
import { Container, Registration as R, type IContainer } from 'ts-ioc-container';
import { ZodError, type ZodType } from 'zod';
import {
  containerMiddleware,
  convertOpenAPIPathToExpress,
  extractRoutes,
  getContainerOrFail,
  type HttpRouteInstance,
} from '@ibabkin/openapi-express-server';
import { PAYLOADS } from './.generated/validators';
import spec from './.generated/swagger.json' with { type: 'json' };

function applyRoutes(
  app: Express,
  container: IContainer,
  doc: OpenAPIV3.Document,
  validators: Record<string, ZodType>,
) {
  for (const route of extractRoutes(doc)) {
    if (!container.hasRegistration(route.operationId)) continue; // not implemented yet
    const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
    const requestScope = containerMiddleware(container, route.tags);
    app[method](convertOpenAPIPathToExpress(route.path), requestScope, async (req, res, next) => {
      try {
        const scope = getContainerOrFail(req);
        const useCase = scope.resolve<HttpRouteInstance>(route.operationId);
        const payload = validators[route.operationId].parse(req);
        const { status = 200, headers = {}, body } = await useCase.handle(payload, scope);
        res.status(status).set(headers);
        if (body === undefined) res.end();
        else res.json(body);
      } catch (error) {
        next(error);
      }
    });
  }
}

const container = new Container({ tags: ['application'] })
  .addRegistration(R.fromClass(GetUser).bindToKey('getUser'))
  .addRegistration(R.fromClass(UpdateTodo).bindToKey('updateTodo'));

const app = express();
app.use(express.json());
applyRoutes(app, container, spec as OpenAPIV3.Document, PAYLOADS);
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(error instanceof ZodError ? 400 : 500).json({ error: error.message });
});
```

Register use cases **before** calling `applyRoutes`: it skips every operation that has nothing
registered under its `operationId` at that moment.

### Request-scoped services

```typescript
import { bindTo, register, scope, singleton } from 'ts-ioc-container';

@register(bindTo('ITransaction'), scope((s) => s.hasTag('request')), singleton())
class Transaction {}
```

One instance per request, disposed with the request scope. Use `s.hasTag('<tag>')` with an
OpenAPI tag to limit a registration to the operations carrying that tag.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| `hasRegistration(operationId)` is `false` although it was registered | `container.register(key, provider)` is invisible to `hasRegistration` | Use `addRegistration(R.fromClass(X).bindToKey(operationId))` |
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
