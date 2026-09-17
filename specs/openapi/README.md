# Specs

Normative specifications for behaviour that is shared across packages, written before the code
that implements them.

## Why they exist

The generators and the Express runtime derive the same names from the same OpenAPI input in
different places. When those derivations are only described by their implementation they drift —
[SPEC-001](./SPEC-001-controller-naming.md) exists because the controller name was computed three
times, in three slightly different ways, and two of them disagreed. A spec gives one statement of
the rule that all three implementations and their tests point at.

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

| Spec | Title | Packages |
| --- | --- | --- |
| [SPEC-001](./SPEC-001-controller-naming.md) | Controller naming from OpenAPI tags | `@ibabkin/openapi-to-server`, `@ibabkin/openapi-express-server` |
