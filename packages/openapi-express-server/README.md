# @ibabkin/openapi-express-server

Express.js building blocks for wiring routes from an OpenAPI spec to use cases resolved from a
[`ts-ioc-container`](https://github.com/IgorBabkin/ts-ioc-container) scope. Pairs with
`@ibabkin/openapi-to-server` (one `<Op>UseCase` interface per operation) and `@ibabkin/openapi-to-zod`
(Zod payload validators).

## Exports

- `extractRoutes(spec)` — flattens an `OpenAPIV3.Document` into `RouteMetadata[]` (`path`, `method`, `operationId`, `tags`); `operationId` is the DI key of the operation's use case, `tags` are the operation's tags verbatim
- `convertOpenAPIPathToExpress(path)` — `/users/{id}` → `/users/:id`
- `buildPayload(req)` — picks `params`, `query`, `body`, `headers` off an Express request
- `containerMiddleware(appContainer, tags?)` — creates a request-scoped child container tagged `['request', ...tags]`, attaches it to `req.container`, and disposes it when the response finishes. Mount it per route with `route.tags` so registrations bound to a tag (`scope((s) => s.hasTag('admins'))`) apply to exactly the operations carrying it
- `getContainerOrFail(req)` — reads `req.container` or throws

## Usage

Register one use case per operation in an application container, keyed by its `operationId`, then register one
Express route per operation. A reference `RouteBuilder` that does exactly this lives in
[`__tests__/RouteBuilder.ts`](./__tests__/RouteBuilder.ts):

```typescript
import 'reflect-metadata';
import express from 'express';
import { Container, Registration } from 'ts-ioc-container';
import { PAYLOADS } from './generated-validators';
import { RouteBuilder } from './RouteBuilder';

const container = new Container({ tags: ['application'] });
container.addRegistration(Registration.fromClass(GetUsers).bindToKey('getUsers'));
container.addRegistration(Registration.fromClass(CreateUser).bindToKey('createUser'));

const app = express();
app.use(express.json());

container.resolve(RouteBuilder, { args: [spec, PAYLOADS] }).applyTo(app);

app.use((error, req, res, next) => {
  res.status(error instanceof ZodError ? 400 : 500).json({ error: error.message });
});
```

Each route mounts `containerMiddleware(container, route.tags)`, so every request gets a scope tagged with
`request` and the operation's tags. The handler resolves the use case from that scope under the `operationId`,
validates `req` with the Zod schema for the same `operationId`, calls `useCase.handle(payload, scope)`, and writes
`{ status, headers, body }` to the response.

## Development

```bash
pnpm build
pnpm test
```

`__tests__/integration/generated.spec.ts` generates types and validators from `__tests__/integration/api.yaml` at
test time and runs an end-to-end server against them.

## License

ISC
