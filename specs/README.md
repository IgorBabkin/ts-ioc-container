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
    container-modules.md
    dependency-resolution.md
    dependency-registration.md
    errors-and-boundaries.md
    injector-strategies.md
    lifecycle-hooks.md
    metadata-utilities.md
    provider-behavior.md
    scoped-lifecycle.md
    token-based-injection.md
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

| Spec                                                            | Acceptance tests                                     | Related docs / ADRs                                                   |
| --------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| [Dependency resolution](epics/dependency-resolution.md)         | `__tests__/specs/dependency-resolution.spec.ts`      | `docs/src/pages/index.mdx`                                            |
| [Scoped lifecycle](epics/scoped-lifecycle.md)                   | `__tests__/specs/scoped-lifecycle.spec.ts`           | `docs/src/pages/container.mdx`, ADR 0001, ADR 0006                    |
| [Dependency registration](epics/dependency-registration.md)     | Planned: `__tests__/specs/dependency-registration.spec.ts` | `docs/src/pages/registration.mdx`, ADR 0003                      |
| [Provider behavior](epics/provider-behavior.md)                 | Planned: `__tests__/specs/provider-behavior.spec.ts` | `docs/src/pages/provider.mdx`, `docs/src/pages/pipes.mdx`, ADR 0004   |
| [Token-based injection](epics/token-based-injection.md)         | Planned: `__tests__/specs/token-based-injection.spec.ts` | `docs/src/pages/token.mdx`, ADR 0005, ADR 0009                   |
| [Injector strategies](epics/injector-strategies.md)             | Planned: `__tests__/specs/injector-strategies.spec.ts` | `docs/src/pages/injector.mdx`, ADR 0002                          |
| [Lifecycle hooks](epics/lifecycle-hooks.md)                     | Planned: `__tests__/specs/lifecycle-hooks.spec.ts` | `docs/src/pages/hooks.mdx`, ADR 0007                                  |
| [Metadata utilities](epics/metadata-utilities.md)               | Planned: `__tests__/specs/metadata-utilities.spec.ts` | `docs/src/pages/metadata.mdx`, ADR 0008                          |
| [Container modules](epics/container-modules.md)                 | Planned: `__tests__/specs/container-modules.spec.ts` | `docs/src/pages/container.mdx`, ADR 0007                         |
| [Errors and boundaries](epics/errors-and-boundaries.md)         | Planned: `__tests__/specs/errors-and-boundaries.spec.ts` | ADR 0001                                                         |

## Style

Specs should describe observable behavior. Prefer acceptance criteria such as
"a disposed container rejects further resolution" over implementation language
such as "the providers map is cleared".

Use BDD-style wording in tests, but keep the implementation loop TDD-friendly:
write the failing scenario, make it pass, then refactor.
