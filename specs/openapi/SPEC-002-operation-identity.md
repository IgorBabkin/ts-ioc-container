# SPEC-002 · Operation identity from `operationId`

Status: **active** · Requirement prefix: `OP`

## Context

[SPEC-001](./SPEC-001-controller-naming.md) covers the name derived from a tag and explicitly
leaves `operationId` out of scope. This spec covers `operationId` itself, which is the join key
between everything the three packages emit: the generated type names, the controller method, the
`PAYLOADS` entry that validates the request, the `ApiClient` method and the runtime dispatch.

| Consumer | Produced by | Uses `operationId` as |
| --- | --- | --- |
| Payload / response / route types | `payload_name`, `response_name`, `route_name` helpers | `GetUserPayload`, `GetUserResponse`, `GetUserRoute` |
| `Operations`, `RoutesPayloads` maps | `Components.ts.hbs` | object key |
| Controller method | `Controllers.ts.hbs` | method name |
| `PAYLOADS` map | `Document.hbs` (`@ibabkin/openapi-to-zod`) | object key |
| `ApiClient` method | `Client.hbs` | method name |
| `RouteMetadata.methodName` | `extractRoutes` | the method the runtime calls on the resolved controller |

Nothing normalises it, so the OpenAPI document is the single source of truth for these names — and
the document has to hold up its end: the contract below is as much a constraint on the input as on
the output.

## Requirements

**OP-1** — `operationId` is used **verbatim** as an identifier and as an object key: as the
controller method name, the `ApiClient` method name, the key in `Operations`, `RoutesPayloads` and
`PAYLOADS`, and as `RouteMetadata.methodName`. All six agree character for character, so the
validator, the controller method and the generated types of one operation are reachable from one
string.

**OP-2** — The type names derived from it are `<Capitalized>Payload`, `<Capitalized>Response` and
`<Capitalized>Route`, where `<Capitalized>` upper-cases the **first character only** and leaves the
rest untouched: `getUser` → `GetUserPayload`, `get_user` → `Get_userPayload`, `GETUser` →
`GETUserPayload`.

**OP-3** — `operationId` is **not** normalised into a TypeScript identifier (contrast
[CN-3](./SPEC-001-controller-naming.md)). A document whose `operationId` is not already a valid
identifier produces output that does not parse; the contract side has to fix the name.

**OP-4** — `operationId` is **unique across the whole document**, not per path or per method. It
keys flat maps, so two operations sharing one id emit duplicate type declarations and duplicate
map keys rather than being merged or rejected.

**OP-5** — An operation **without** an `operationId` is not a route: `extractRoutes` skips it, and
so does the controller grouping (`group_by_tags`). See the known divergence below — the type and
validator templates do not skip it.

## Naming table

| `operationId` | Payload type | Response type | Route type | Controller method / `PAYLOADS` key |
| --- | --- | --- | --- | --- |
| `getUser` | `GetUserPayload` | `GetUserResponse` | `GetUserRoute` | `getUser` |
| `get_user` | `Get_userPayload` | `Get_userResponse` | `Get_userRoute` | `get_user` |
| `GETUser` | `GETUserPayload` | `GETUserResponse` | `GETUserRoute` | `GETUser` |
| `2fa` | `2faPayload` (does not parse — see OP-3) | … | … | `2fa` |

## Known divergence

`extractRoutes` and `group_by_tags` skip an operation without an `operationId` (OP-5), but
`Components.ts.hbs`, `Client.hbs` and `Document.hbs` reach it through `get_methods_obj`, which does
not filter. They then fail in two different ways:

| Renderer | Result |
| --- | --- |
| `renderComponents`, `renderClient` | `capitalize(undefined)` throws `TypeError: Cannot read properties of undefined` mid-render |
| `renderValidators` | renders an entry with an **empty key** — `PAYLOADS` contains `: z.object({})`, which does not parse |
| `renderControllers`, `renderServer`, `extractRoutes` | the operation is skipped, per OP-5 |

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
