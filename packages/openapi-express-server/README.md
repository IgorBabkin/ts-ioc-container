# @ibabkin/openapi-express-server

Express.js building blocks for wiring routes from an OpenAPI spec to controllers resolved from a
[`ts-ioc-container`](https://github.com/IgorBabkin/ts-ioc-container) scope. Pairs with
`@ibabkin/openapi-to-server-interface` (controller interfaces) and `@ibabkin/openapi-to-request-validator`
(Zod payload validators).

## Exports

- `extractRoutes(spec)` — flattens an `OpenAPIV3.Document` into `RouteMetadata[]` (path, method, operationId, controller/method names derived from the first tag and `operationId`)
- `convertOpenAPIPathToExpress(path)` — `/users/{id}` → `/users/:id`
- `buildPayload(req)` — picks `params`, `query`, `body`, `headers` off an Express request
- `containerMiddleware(appContainer)` — creates a request-scoped child container, attaches it to `req.container`, and disposes it when the response finishes
- `getContainerOrFail(req)` — reads `req.container` or throws

## Usage

Register controllers in an application container keyed by their OpenAPI tag, then register one Express route per
operation. A reference `RouteBuilder` that does exactly this lives in [`__tests__/RouteBuilder.ts`](./__tests__/RouteBuilder.ts):

```typescript
import 'reflect-metadata';
import express from 'express';
import { Container, Registration } from 'ts-ioc-container';
import { containerMiddleware } from '@ibabkin/openapi-express-server';
import { PAYLOADS } from './generated-validators';
import { RouteBuilder } from './RouteBuilder';

const container = new Container({ tags: ['application'] });
container.addRegistration(Registration.fromClass(UsersController).bindToKey('Users'));

const app = express();
app.use(express.json());
app.use(containerMiddleware(container));

container.resolve(RouteBuilder, { args: [spec, PAYLOADS] }).applyTo(app);

app.use((error, req, res, next) => {
  res.status(error instanceof ZodError ? 400 : 500).json({ error: error.message });
});
```

Each request resolves the controller from the request scope, validates `req` with the Zod schema for the
`operationId`, calls `controller[methodName](payload)`, and writes `{ status, headers, body }` to the response.

## Development

```bash
pnpm build
pnpm test
```

`__tests__/integration/generated.spec.ts` generates types and validators from `__tests__/integration/api.yaml` at
test time and runs an end-to-end server against them.

## License

ISC
