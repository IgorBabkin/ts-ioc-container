# Specs

Normative specifications for behaviour that is shared across packages, written before the code
that implements them.

## Why they exist

The generators and the Express runtime derive the same names from the same OpenAPI input in
different places. When those derivations are only described by their implementation they drift —
[SPEC-001](./SPEC-001-controller-naming.md) was written because the controller name was computed
three times, in three slightly different ways, and two of them disagreed. A spec gives one
statement of the rule that all implementations and their tests point at — and when the concept
itself goes away, as the controller did in [SPEC-007](./SPEC-007-use-case-per-operation.md), the
spec is what says so.

A spec belongs here when the behaviour is **observable by a consumer** (the shape of generated
code, a runtime lookup key, a CLI contract) **and touched by more than one package**. Behaviour
internal to a single module is specified by its tests alone.

## Layout

```
specs/SPEC-<nnn>-<slug>.md
```

Each spec numbers its requirements `<PREFIX>-<n>` (e.g. `CN-3`). Requirement IDs are permanent:
when a requirement is dropped it is struck through rather than renumbered, so older commits and
test names keep resolving.

## Workflow (SDD → TDD)

1. **Spec first.** Write or amend the spec. State each requirement as a single testable sentence,
   in the imperative, with the edge cases spelled out in a table. If you cannot write the
   assertion from the sentence alone, the sentence is not specific enough yet.
2. **Test second.** Write the tests that assert each requirement, and watch them fail. Name the
   `describe` after the spec (`describe('SPEC-001 · controller naming', ...)`) and cite the
   requirement ID in the `it` or in a comment, so a failure points at the rule it broke.
3. **Implement third.** Write the smallest change that turns the tests green.
4. **Cross-package requirements get a cross-package test.** A rule that two packages must agree on
   is worth an assertion that actually compares the two outputs, not two assertions that happen to
   use the same literal — see the `IServer`-key test in
   `packages/openapi-express-server/__tests__/routeExtractor.spec.ts`.

When behaviour changes, the spec is amended in the same commit as the code. A spec that documents
what the code used to do is worse than no spec.

## Index

Every spec is referenced here. A spec that is not listed does not exist yet — adding one means
adding its row.

| Spec | Title | Prefix | Packages | Covers |
| --- | --- | --- | --- | --- |
| [SPEC-001](./SPEC-001-controller-naming.md) | ~~Controller naming from OpenAPI tags~~ | `CN` | — | **Superseded** by SPEC-007: there are no controllers |
| [SPEC-002](./SPEC-002-operation-identity.md) | Operation identity from `operationId` | `OP` | all three | `operationId` as the join key between the generated types, the use case, the validator, the client and the runtime |
| [SPEC-003](./SPEC-003-request-payload.md) | Request payload projection | `RP` | all three | The one payload object described by the server types, the client types and the Zod validator that projects the Express `Request` |
| [SPEC-004](./SPEC-004-http-methods.md) | HTTP method coverage | `HM` | all three | Which (path, method) pairs each stage of the pipeline looks at, and how the three hard-coded method lists differ |
| [SPEC-005](./SPEC-005-url-construction.md) | URL construction and path parameters | `URL` | `openapi-to-server`, `openapi-express-server` | `createUrl` filling `{name}` in and `convertOpenAPIPathToExpress` rewriting it into a route that matches the result |
| [SPEC-006](./SPEC-006-template-registry.md) | Shared Handlebars registry | `TR` | `openapi-to-server`, `openapi-to-zod` | The process-global template and helper namespaces that both generators precompile into |
| [SPEC-007](./SPEC-007-use-case-per-operation.md) | Use case per operation | `UC` | `openapi-to-server`, `openapi-express-server` | One `<Op>UseCase` per `operationId`, `IServer` and the DI key keyed by it, and tags carried onto the request scope instead of naming anything |

Each spec carries its own requirements, edge-case tables and the tests that assert them; this index
does not repeat them, so there is one place to change when a requirement changes.
