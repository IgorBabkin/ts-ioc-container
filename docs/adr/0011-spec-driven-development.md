# ADR 0011 - Spec-driven development workflow

- **Status:** Accepted
- **Date:** 2026-04-26
- **Deciders:** core maintainers
- **Tags:** process, testing, documentation

## Context

`ts-ioc-container` exposes a small public API with behavior that is easy to
break accidentally: scope resolution, token composition, provider visibility,
hooks, lifecycle cleanup, and generated documentation examples.

The repository already has executable README examples and ADRs, but behavior
can still be scattered across prose, tests, and implementation details. A
contributor needs a clear path from product intent to implementation.

## Decision

Use a spec-driven workflow for public behavior changes.

- ADRs explain important decisions and trade-offs.
- Specs describe epics, stories, use cases, and acceptance criteria.
- Acceptance tests in `__tests__/specs/` execute the public contract.
- Unit and integration tests remain in the existing feature folders for focused
  implementation coverage.
- README examples remain executable under `__tests__/readme/` and are rendered
  through `.readme.hbs.md`.

Public behavior changes should follow this loop:

1. Update or add a spec in `specs/`.
2. Add or update failing acceptance tests in `__tests__/specs/`.
3. Implement the behavior in `lib/`.
4. Update README/docs examples when user-facing usage changes.
5. Keep ADRs for decisions that affect architecture or long-term process.

The test style is BDD-oriented, using Vitest scenarios that describe observable
behavior. The engineering loop remains TDD-compatible: write the failing
behavior test first, implement, then refactor.

## Consequences

**Positive**

- Product intent, acceptance criteria, tests, and docs become traceable.
- Reviewers can distinguish public contract tests from implementation-detail
  tests.
- Documentation changes are anchored to executable behavior.
- Future contributors get an explicit workflow for evolving the library.

**Negative / trade-offs**

- Public changes require one more artifact when behavior is new or changed.
- Specs must be maintained, otherwise they become another source of drift.
- Some existing tests will remain in legacy feature folders until moved or
  linked during normal feature work.

## References

- `specs/README.md`
- `specs/epics/dependency-resolution.md`
- `specs/epics/scoped-lifecycle.md`
- `__tests__/specs/`
- `__tests__/readme/`
- `.readme.hbs.md`
- `docs/src/pages/spec-driven.mdx`
