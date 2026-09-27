# @ts-ioc-container/openapi-to-server — guide for AI coding agents

This file ships inside the npm package, so it matches the version installed in `node_modules`.
**Trust it over what you remember** about this package or about other OpenAPI generators: there are
no controllers and nothing is derived from tags or paths. More detail: `README.md` next to this file.
Types: `esm/*.d.ts`.

Sibling packages, used together with this one:

- `@ts-ioc-container/openapi-to-zod` — Zod validators, `PAYLOADS` map keyed by the same `operationId`
- `@ts-ioc-container/openapi-express-server` — Express + `ts-ioc-container` runtime glue

## What it generates

From an OpenAPI **3.0** document (YAML or JSON):

| Output | Where | Shape |
| --- | --- | --- |
| Component types | `openapi-to-server` | `export type Todo = { ... }` per `components.schemas` entry |
| Payload type | `openapi-to-server`, `openapi-to-client` | `<Op>Payload = { params?, query?, body? }` — each member only if declared |
| Response type | `openapi-to-server`, `openapi-to-client` | `<Op>Response extends HttpResponse { status; headers; body }` |
| Use case interface | `openapi-to-server` | `<Op>HttpRoute extends HttpRoute<<Op>Payload, <Op>Response>` |
| Maps | `openapi-to-server` | `Operations`, `RoutesPayloads`, `IServer` — all keyed by `operationId` |
| Client | `openapi-to-client` | Axios `ApiClient` class, one method per `operationId` |

`<Op>` is the `operationId` with only its first character upper-cased: `getUser` → `GetUserPayload`,
`GetUserResponse`, `GetUserHttpRoute`. The `operationId` itself is used **verbatim** everywhere else
(`IServer`, `Operations`, `PAYLOADS`, DI key). Tags name nothing; they only appear as `@tags` in the
doc comment.

## Recipes

### Generate (CLI, after `pnpm add @ts-ioc-container/openapi-to-server`)

```bash
openapi-to-server --input src/swagger.yaml --output src/.generated/operations.d.ts --json
openapi-to-client --input src/swagger.yaml --output src/.generated/client.ts
```

`--json` also writes the parsed document as `swagger.json` next to the output (YAML input only);
load that at runtime to register routes. Short flags: `-i`, `-o`, `-j`. YAML may use `yaml-import`
directives (`!!import/merge`).

### Generate (programmatic)

```typescript
import { openapiToServer, openapiToClient, renderComponents, renderServer, renderClient } from '@ts-ioc-container/openapi-to-server';

openapiToServer({ inputFile: 'src/swagger.yaml', outputFile: 'src/.generated/operations.d.ts', emitJSON: true });
openapiToClient({ inputFile: 'src/swagger.yaml', outputFile: 'src/.generated/client.ts' });

const source: string = renderComponents(doc) + renderServer(doc); // doc: OpenAPIV3.Document
```

### Implement a use case

```typescript
import { HttpStatus } from '@ts-ioc-container/openapi-to-server';
import type { IContainer } from 'ts-ioc-container';
import type { UpdateTodoHttpRoute, UpdateTodoPayload, UpdateTodoResponse } from './.generated/operations';

export class UpdateTodo implements UpdateTodoHttpRoute {
  async handle({ params, body }: UpdateTodoPayload, scope: IContainer): Promise<UpdateTodoResponse> {
    return { status: HttpStatus.OK, headers: {}, body: { ...body } };
  }
}
```

One class per operation. Register it under its `operationId` (see `@ts-ioc-container/openapi-express-server`).
`IServer` lists the constructor every `operationId` needs, so `const server: IServer = { updateTodo: UpdateTodo }`
fails to compile when a use case is missing.

### Call the API

```typescript
import axios from 'axios';
import { ApiClient } from './.generated/client';

const api = new ApiClient(axios.create({ baseURL: 'https://api.example.com' }));
await api.updateTodo({ params: { id: 1 }, query: { dryRun: true }, body: { title: 'x' } });
```

The generated client imports `createUrl` from this package **at runtime**: it must be a regular
`dependency`, not a `devDependency`, of the app that ships the client.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| `TypeError: Cannot read properties of undefined` while rendering | An operation has no `operationId` | Give every operation an `operationId` |
| A `patch` / `head` / `options` / `trace` operation has no types, `IServer` entry or client method | Only `get`, `post`, `put`, `delete` are generated (SPEC-004) | Use one of the four methods |
| A path parameter is missing from `<Op>Payload` | Parameters declared on the path item, or via `$ref`, are ignored | Declare every parameter inline on the operation |
| Header / cookie parameters missing from the payload | Only `query`, `path` and the JSON `requestBody` form the payload | Read headers from the request |
| `body` is required although `requestBody.required` is false | `body` is always required | Model optionality inside the body schema |
| A status is missing from `<Op>Response` | Only `200`, `201`, `204`, `302` are typed; `body` comes from the `200`/`201` JSON schema, `headers.Location` from `302` | Signal errors by throwing; handle them in Express error middleware |
| Renaming an `operationId` breaks the app | It is the type name, the `IServer` key and the DI key | Rename the DI registration and the use case together |
| Old code uses `*Controller` types or tag-named groups | Controllers were removed (SPEC-001 superseded by SPEC-007) | One `<Op>HttpRoute` per operation |

## Exports

`openapiToServer`, `openapiToClient`, `renderComponents`, `renderServer`, `renderClient`,
`createUrl`, `addPathParams`, `addQueryParams`, types `HttpRoute`, `HttpResponse`, `HttpStatus`,
`RouteOptions`, `constructor`, `Payload`, `Params`, `Query`, `Body`, `OpenapiToServerOptions`,
`OpenapiToClientOptions`.

`createUrl('/users/{id}', { params: { id: 1 }, query: { expand: 'posts' } })` → `'/users/1?expand=posts'`;
`null` / `undefined` values are skipped, keys and values are URL-encoded.

## Errors

| Message | Fix |
| --- | --- |
| `openapi file path is required (--input)` | Pass `--input <spec>` |
| `output file path is required (--output)` | Pass `--output <file>` |
