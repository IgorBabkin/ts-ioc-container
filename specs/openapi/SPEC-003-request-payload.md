# SPEC-003 · Request payload projection

Status: **active** · Requirement prefix: `RP`

## Context

One request payload object is described three times, by three packages, and the three descriptions
have to be the same object:

| Producer | Artefact | Role |
| --- | --- | --- |
| `@ibabkin/openapi-to-server` | `<Op>Payload` type (`ServerRoute.hbs`) | what the controller method receives |
| `@ibabkin/openapi-to-server` | `<Op>Payload` type (`ClientRoute.hbs`) | what `ApiClient.<op>()` accepts |
| `@ibabkin/openapi-to-zod` | `PAYLOADS[<operationId>]` (`ValidationRoute.hbs`) | what turns an Express `Request` into that object at runtime |

The runtime never constructs the payload from the type — it parses the Express `Request` with the
Zod schema and hands the result to the controller (`validators[operationId].parse(req)` in the
reference `RouteBuilder`). A Zod object strips unknown keys, so **the validator is the projection**:
whatever it does not mention never reaches the controller, whatever it mentions must exist on the
generated type, or the controller's typed signature is a lie.

## Requirements

**RP-1** — A payload has at most three members, `query`, `params` and `body`, and no others.

**RP-2** — Each member is emitted **iff** the operation declares its source, and both generators
use the same condition:

| Member | Emitted when | Contents |
| --- | --- | --- |
| `query` | the operation has ≥ 1 parameter with `in: query` | those parameters |
| `params` | the operation has ≥ 1 parameter with `in: path` | those parameters |
| `body` | the operation has a `requestBody` | `requestBody.content.application/json.schema` |

An operation with none of the three has the payload `{}`.

**RP-3** — A parameter contributes a property named by its `name`, used **verbatim** (it is not
normalised — same constraint as [OP-3](./SPEC-002-operation-identity.md)). The property is optional
unless the parameter has `required: true`: `?` on the type side, `.optional()` on the validator
side.

**RP-4** — `body` is always required, on both sides, whatever `requestBody.required` says. Only
`application/json` content is read; an operation whose body is declared under another media type
gets a `body` member typed from a missing schema rather than the schema of that media type.

**RP-5** — Parameters with `in: header` and `in: cookie` are **not** part of the payload. Headers
are reachable through the request, not through the payload.

**RP-6** — `PAYLOADS[operationId].parse(req)` returns exactly the members RP-2 requires and strips
everything else off the `Request`, so its result is assignable to `<Op>Payload`. This is the
requirement that makes the generated controller signature true at runtime.

**RP-7** — The client payload type and the server payload type of one operation are the same
shape, so a value built for `ApiClient.<op>()` satisfies the controller's parameter and vice
versa. The client splits it back apart: `params` and `query` build the URL
([SPEC-005](./SPEC-005-url-construction.md)), `body` is sent as the request body, and `body` is
sent **only** when the operation declares a `requestBody`.

**RP-8** — `buildPayload(req)` (`@ibabkin/openapi-express-server`) is a validator-free projection
for callers that do not generate validators. It is **not** interchangeable with RP-6: it adds a
`headers` member, and it omits `params`/`query` when they are empty, where RP-2 makes them
required members of the type. A route wired with `buildPayload` alone can hand a controller a
payload its type says cannot occur.

## Known divergence

**Path-item-level parameters are ignored.** OpenAPI allows `parameters` on the path item, shared by
every operation under it. `filter_parameters` only ever sees `operation.parameters`, so a path
parameter declared once for the whole path item contributes nothing: the payload has no `params`
member although the path is templated, and the validator does not check it. Every parameter an
operation needs has to be declared on the operation.

**`$ref`'d parameters are dropped silently.** `filter_parameters` matches on `item.in`, which a
`{ $ref: … }` entry does not have, so a referenced parameter is neither resolved nor reported — it
simply disappears from the payload and from the validator.

## Tests

| Requirement | Test |
| --- | --- |
| RP-1, RP-2, RP-3, RP-4, RP-5 | `packages/openapi-express-server/__tests__/payloadProjection.spec.ts` |
| RP-6 | `packages/openapi-express-server/__tests__/payloadProjection.spec.ts` |
| RP-7 | `packages/openapi-to-server-interface/__tests__/client.spec.ts`, `packages/openapi-express-server/__tests__/payloadProjection.spec.ts` |
| RP-8 | `packages/openapi-express-server/__tests__/utils.spec.ts` |
| Known divergence | `packages/openapi-express-server/__tests__/payloadProjection.spec.ts` |
