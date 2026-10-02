# SPEC-004 · HTTP method coverage

Status: **active** · Requirement prefix: `HM`

## Context

An operation is a (path, method) pair, and every stage of the pipeline decides for itself which
methods it looks at. Today two different lists are hard-coded in two places:

| Consumer | Produced by | Methods |
| --- | --- | --- |
| Payload / response / use case types, `Operations`, `RoutesPayloads`, `IServer`, `ApiClient`, `PAYLOADS` | `get_methods_obj` (both packages) | `put`, `delete`, `post`, `get` |
| Runtime routes | `extractRoutes` | `get`, `post`, `put`, `patch`, `delete`, `options`, `head` |

These sets are nested but not equal, and a method that is in one and not another produces output
that is worse than an unsupported method: it looks generated and does not work. This spec states
the set a document can rely on, and pins what the other does until they are unified. (A third
list, `group_by_tags` with `patch`, went with the controllers —
[SPEC-007](./SPEC-007-use-case-per-operation.md).)

## Requirements

**HM-1** — An operation is **fully supported** iff its method is one of `get`, `post`, `put`,
`delete` — the intersection of the two lists. For those four, every consumer agrees: the types,
the use case, the validator and the runtime route exist and refer to one another.

**HM-2** — Each consumer covers exactly the methods in the table above. A method outside a
consumer's list is invisible to it: it emits nothing, and reports nothing.

**HM-3** — `RouteMetadata.method` is the method **upper-cased** (`GET`), and the generated
`ApiClient` passes it to Axios **lower-cased** (`method: 'get'`), matching the key in the OpenAPI
document. A consumer lower-cases `RouteMetadata.method` again to index an Express app.

**HM-4** — Within one path item the type, use case, `IServer`, validator and client templates
emit operations in the fixed order `put`, `delete`, `post`, `get`, not in document order. Ordering
of generated declarations is therefore stable across runs for a given document but is not the
document's ordering. Runtime routes follow document order instead.

**HM-5** — Until HM-2's lists are unified, a method outside HM-1's four is **not supported**, and
the shape of its failure is:

| Method | What happens |
| --- | --- |
| `patch`, `options`, `head` | `extractRoutes` returns a route, so a consumer registers it, but no use case, types or validator were generated for the operation: the reference `RouteBuilder` skips it with a warning when nothing is registered under its `operationId`, and throws `Validator for operation "<id>" not found` on the first request when something is. |
| `trace` | Invisible everywhere. Nothing is generated and no route is registered. |

## Known divergence

HM-5 is a defect, not a design: `patch` is a mainstream method, and the divergence between
`get_methods_obj` and `extractRoutes` is the same class of bug as the one
[SPEC-001](./SPEC-001-controller-naming.md) was written to close — one concept computed in several
places, drifting. Unifying the lists changes generated output for every consumer (a `patch`
operation would start emitting types), so it is a deliberate, release-triggering change and is not
made by this spec. The tests pin today's behaviour and will fail when it is fixed, which is the
point: the spec and the tests are amended together with the fix.

## Tests

| Requirement | Test |
| --- | --- |
| HM-1, HM-2 | `packages/openapi-express-server/__tests__/httpMethods.spec.ts` |
| HM-3 | `packages/openapi-express-server/__tests__/httpMethods.spec.ts` |
| HM-4 | `packages/openapi-express-server/__tests__/httpMethods.spec.ts` |
| HM-5 | `packages/openapi-express-server/__tests__/httpMethods.spec.ts` |
