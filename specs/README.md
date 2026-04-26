# Specifications

This directory is the product-facing contract for `ts-ioc-container`.

Specs describe what the library promises before the implementation describes
how it works. They are written for maintainers, contributors, and reviewers who
need to understand intended behavior without reading all of `lib/`.

## Artifact roles

| Artifact               | Role                                                                       |
| ---------------------- | -------------------------------------------------------------------------- |
| `docs/adr/`            | Explains important architecture or process decisions and their trade-offs. |
| `specs/`               | Defines epics, stories, use cases, acceptance criteria, and traceability.  |
| `__tests__/specs/`     | Executes the accepted public behavior contract.                            |
| `__tests__/<feature>/` | Covers implementation details and focused regression cases.                |
| `__tests__/readme/`    | Keeps README examples executable and documentation-safe.                   |
| `lib/`                 | Implements the accepted behavior.                                          |

## Structure

```text
specs/
  README.md
  epics/
    dependency-resolution.md
    scoped-lifecycle.md
  templates/
    feature-spec.md
```

## Workflow

1. Write or update the relevant spec.
2. Translate acceptance criteria into Vitest scenarios under
   `__tests__/specs/`.
3. Implement the behavior in `lib/`.
4. Update executable README examples in `__tests__/readme/` when usage changes.
5. Update the docs site and `.readme.hbs.md` when public documentation changes.
6. Add an ADR only when the change makes a durable architecture or process
   decision.

## Traceability

| Spec                                                    | Acceptance tests                                | Related docs                   |
| ------------------------------------------------------- | ----------------------------------------------- | ------------------------------ |
| [Dependency resolution](epics/dependency-resolution.md) | `__tests__/specs/dependency-resolution.spec.ts` | `docs/src/pages/index.mdx`     |
| [Scoped lifecycle](epics/scoped-lifecycle.md)           | `__tests__/specs/scoped-lifecycle.spec.ts`      | `docs/src/pages/container.mdx` |

## Style

Specs should describe observable behavior. Prefer acceptance criteria such as
"a disposed container rejects further resolution" over implementation language
such as "the providers map is cleared".

Use BDD-style wording in tests, but keep the implementation loop TDD-friendly:
write the failing scenario, make it pass, then refactor.
