# SPEC-007 · Use case per operation

Status: **active** · Requirement prefix: `UC` · Implements [#18](https://github.com/IgorBabkin/openapi-to-server/issues/18) · Supersedes [SPEC-001](./SPEC-001-controller-naming.md)

## Context

The server contract used to be a set of **controllers**: one interface per tag, one method per
operation, and an `IServer` keyed by the tag ([SPEC-001](./SPEC-001-controller-naming.md)). That is
not how the code on the other side is structured. A consumer implements **one class per
operation** and keys it by `operationId`; the controller interfaces were never implemented, and the
tag-to-identifier normalisation existed only to name something nobody wrote.

This spec replaces the controller with the **use case**: one interface per operation, named from
`operationId`, handling exactly one payload and returning exactly one response. A tag no longer
names anything — it is metadata the runtime attaches to the request scope, which is what lets
middleware and registrations be applied per domain rather than per operation.

| Consumer | Produced by | Uses |
| --- | --- | --- |
| HttpRoute interface | `ServerRoute.hbs` | `export interface GetUserHttpRoute extends HttpRoute<GetUserPayload, GetUserResponse> {}` |
| `Operations` map | `Components.ts.hbs` | `getUser: GetUserHttpRoute` |
| `IServer` property | `IServer.ts.hbs` | `getUser: constructor<GetUserHttpRoute>` |
| DI lookup key | `extractRoutes` → `RouteMetadata.operationId` | `container.resolve('getUser')` |
| Request scope tags | `containerMiddleware(appContainer, route.tags)` | `appContainer.createScope({ tags: ['request', ...route.tags] })` |

## Requirements

**UC-1** — Every operation that has an `operationId` is exactly one use case. Nothing groups
operations: two operations never share a generated interface, an `IServer` entry or a DI key,
whatever their tags.

**UC-2** — The use case interface is named `<Capitalized>HttpRoute`, where `<Capitalized>` is the
`operationId` with its first character upper-cased and nothing else changed
([OP-2](./SPEC-002-operation-identity.md)). It extends `HttpRoute<<Capitalized>Payload,
<Capitalized>Response>`, exported by `@ibabkin/openapi-to-server`, which declares a single member
`handle(payload, context): Promise<Response>`.

**UC-3** — `IServer` has one property per use case, keyed by the `operationId` **verbatim** and
typed `constructor<<Capitalized>HttpRoute>`. `Operations` is keyed the same way and maps to the
interface itself. Both are emitted in the order of
[HM-4](./SPEC-004-http-methods.md), from the same method list as the payload and response types.

**UC-4** — `RouteMetadata` is `{ path, method, operationId, tags }`. The runtime resolves the use
case under `operationId` **verbatim** — the same string that keys `IServer`, `Operations` and
`PAYLOADS` ([OP-1](./SPEC-002-operation-identity.md)) — and calls
`handle(PAYLOADS[operationId].parse(req), requestScope)`. No other name is derived from the
document at runtime: there is no controller name, no method name and no `toIdentifier`.

**UC-5** — `RouteMetadata.tags` is the operation's `tags` array **verbatim**, and `[]` when the
operation has none. Tags are not normalised, not truncated and not reordered. An operation
without tags is a route like any other; it is not skipped and no default tag is invented.

**UC-6** — The request scope a use case is resolved from is created with the tags
`['request', ...RouteMetadata.tags]`, in that order, by
`containerMiddleware(appContainer, route.tags)`. A registration or middleware bound to a tag
(`scope((s) => s.hasTag('admins'))`) therefore applies to exactly the operations carrying that
tag, and `context.hasTag(tag)` inside `handle` answers whether the current operation carries it.

**UC-7** — `openapiToServer` writes `renderComponents(doc)` followed by `renderServer(doc)`. There
is no third renderer: the use case interfaces are part of the components output, next to the
payload and response types they refer to.

## Naming table

| `operationId` | HttpRoute interface | `IServer` / `Operations` key | DI key |
| --- | --- | --- | --- |
| `getUser` | `GetUserHttpRoute` | `getUser` | `getUser` |
| `get_user` | `Get_userHttpRoute` | `get_user` | `get_user` |
| `GETUser` | `GETUserHttpRoute` | `GETUser` | `GETUser` |

## Tags table

| Operation `tags` | `RouteMetadata.tags` | Request scope tags |
| --- | --- | --- |
| `['Network Health', 'v1/admin']` | `['Network Health', 'v1/admin']` | `['request', 'Network Health', 'v1/admin']` |
| `['items']` | `['items']` | `['request', 'items']` |
| absent | `[]` | `['request']` |

## What SPEC-001 covered and this spec drops

| SPEC-001 | Here |
| --- | --- |
| `I<Tag>Controller` interface with one method per operation | one `<Op>HttpRoute` interface per operation (UC-1, UC-2) |
| `IServer` keyed by the normalised tag | `IServer` keyed by `operationId` (UC-3) |
| `RouteMetadata.controllerName` / `.methodName` | `RouteMetadata.operationId` is the key (UC-4) |
| `toIdentifier`, `@ibabkin/openapi-to-server/identifier` | removed; nothing is normalised (UC-5) |
| untagged operation → `Default` controller / skipped with a warning | untagged operation → a route with `tags: []` (UC-5) |
| tags name the controller | tags tag the request scope (UC-6) |

## Out of scope

Which middleware a tag selects, and how — that is the consumer's container configuration. This
spec only guarantees that the tag reaches the scope unchanged.

## Tests

| Requirement | Test |
| --- | --- |
| UC-1, UC-2, UC-3, UC-7 | `packages/openapi-to-server-interface/__tests__/useCasePerOperation.spec.ts` |
| UC-3, UC-4 (generated key = runtime key) | `packages/openapi-express-server/__tests__/routeExtractor.spec.ts` |
| UC-4, UC-5 | `packages/openapi-express-server/__tests__/routeExtractor.spec.ts` |
| UC-6 | `packages/openapi-express-server/__tests__/ExpressOpenAPIServer.spec.ts` |
