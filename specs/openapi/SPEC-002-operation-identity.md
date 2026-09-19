# SPEC-002 · Operation identity from `operationId`

Status: **active** · Requirement prefix: `OP`

## Context

[SPEC-007](./SPEC-007-use-case-per-operation.md) makes every operation its own use case. This
spec covers `operationId` itself, which is the join key between everything the three packages
emit: the generated type names, the use case, the `PAYLOADS` entry that validates the request,
the `ApiClient` method and the runtime dispatch.

| Consumer | Produced by | Uses `operationId` as |
| --- | --- | --- |
| Payload / response / use case types | `payload_name`, `response_name`, `http_route_name` helpers | `GetUserPayload`, `GetUserResponse`, `GetUserHttpRoute` |
| `Operations`, `RoutesPayloads`, `IServer` maps | `Components.ts.hbs`, `IServer.ts.hbs` | object key |
| `PAYLOADS` map | `Document.hbs` (`@ibabkin/openapi-to-zod`) | object key |
| `ApiClient` method | `Client.hbs` | method name |
| `RouteMetadata.operationId` | `extractRoutes` | the DI key the runtime resolves the use case under |

Nothing normalises it, so the OpenAPI document is the single source of truth for these names — and
the document has to hold up its end: the contract below is as much a constraint on the input as on
the output.

## Requirements

**OP-1** — `operationId` is used **verbatim** as an identifier and as an object key: as the
`ApiClient` method name, the key in `Operations`, `RoutesPayloads`, `IServer` and `PAYLOADS`, and
as `RouteMetadata.operationId`, the DI key ([UC-4](./SPEC-007-use-case-per-operation.md)). All
six agree character for character, so the validator, the use case and the generated types of one
operation are reachable from one string.

**OP-2** — The type names derived from it are `<Capitalized>Payload`, `<Capitalized>Response` and
`<Capitalized>HttpRoute`, where `<Capitalized>` upper-cases the **first character only** and leaves
the rest untouched: `getUser` → `GetUserPayload`, `get_user` → `Get_userPayload`, `GETUser` →
`GETUserPayload`.

**OP-3** — `operationId` is **not** normalised into a TypeScript identifier. A document whose
`operationId` is not already a valid identifier produces output that does not parse; the contract
side has to fix the name.

**OP-4** — `operationId` is **unique across the whole document**, not per path or per method. It
keys flat maps, so two operations sharing one id emit duplicate type declarations and duplicate
map keys rather than being merged or rejected.

**OP-5** — An operation **without** an `operationId` is not a route: `extractRoutes` skips it.
See the known divergence below — the generators do not skip it.

## Naming table

| `operationId` | Payload type | Response type | HttpRoute type | `IServer` / `PAYLOADS` / DI key |
| --- | --- | --- | --- | --- |
| `getUser` | `GetUserPayload` | `GetUserResponse` | `GetUserHttpRoute` | `getUser` |
| `get_user` | `Get_userPayload` | `Get_userResponse` | `Get_userHttpRoute` | `get_user` |
| `GETUser` | `GETUserPayload` | `GETUserResponse` | `GETUserHttpRoute` | `GETUser` |
| `2fa` | `2faPayload` (does not parse — see OP-3) | … | … | `2fa` |

## Known divergence

`extractRoutes` skips an operation without an `operationId` (OP-5), but `Components.ts.hbs`,
`IServer.ts.hbs`, `Client.hbs` and `Document.hbs` reach it through `get_methods_obj`, which does
not filter. They then fail in two different ways:

| Renderer | Result |
| --- | --- |
| `renderComponents`, `renderServer`, `renderClient` | `capitalize(undefined)` throws `TypeError: Cannot read properties of undefined` mid-render |
| `renderValidators` | renders an entry with an **empty key** — `PAYLOADS` contains `: z.object({})`, which does not parse |
| `extractRoutes` | the operation is skipped, per OP-5 |

`operationId` is optional in the OpenAPI specification, so this is reachable from a valid document.
Deciding between "skip like the others" and "fail with a diagnostic" is a behaviour change and is
not made here; the tests pin what happens today.

## Out of scope

Deriving a missing `operationId` from the method and path (as some generators do) — this spec
requires the document to carry one.

## Tests

| Requirement | Test |
| --- | --- |
| OP-1 | `packages/openapi-express-server/__tests__/operationIdentity.spec.ts` |
| OP-2, OP-3, OP-4 | `packages/openapi-to-server-interface/__tests__/operationId.spec.ts` |
| OP-5, known divergence | `packages/openapi-express-server/__tests__/operationIdentity.spec.ts` |
