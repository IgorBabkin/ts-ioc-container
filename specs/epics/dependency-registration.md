# Epic: Dependency registration

- **Status:** Proposed
- **ADR:** [ADR 0003 - Separate Provider and Registration abstractions](../../docs/adr/0003-provider-vs-registration.md)
- **Public API:** `Registration`, `register`, `bindTo`, `scope`, `IRegistration`
- **Executable spec:** `__tests__/specs/dependency-registration.spec.ts`

## Intent

As an application developer, I want to describe available dependencies as
classes, values, factories, aliases, and scoped services so that application
composition is explicit and repeatable.

## Stories

### Story: Register common dependency shapes

As a library user, I can register classes, configuration values, factory
functions, and key redirects so that different dependency styles use one
registration model.

Acceptance criteria:

- A class registration creates instances through the container injector.
- A value registration resolves the same configured value.
- A factory registration receives the resolving container and options.
- A key registration redirects resolution to another registered dependency.

### Story: Bind registrations to keys and aliases

As a library user, I can bind a registration to explicit keys and aliases so
that consumers can resolve one implementation directly or discover multiple
implementations by alias.

Acceptance criteria:

- A registration bound to a key can be resolved by that key.
- A registration bound to an alias appears in group alias resolution.
- A registration bound to a single-alias token can be resolved as one value.
- Applying a registration without a key fails with `DependencyMissingKeyError`.

### Story: Register through decorators

As a TypeScript developer, I can attach registration configuration to a class
with decorators so that dependency setup can live near the implementation when
that style fits the project.

Acceptance criteria:

- Decorator registration uses the class name as the default key when no key is
  provided.
- Decorator mappers are applied when the class registration is created.
- Multiple decorator mappers compose in a predictable order.

### Story: Constrain registration by scope

As an application architect, I can make a registration apply only to matching
scopes so that request-only, transaction-only, or feature-only dependencies do
not leak into unrelated lifecycles.

Acceptance criteria:

- A scoped registration is applied to containers that match its scope rules.
- A scoped registration is skipped for containers that do not match its rules.
- Multiple scope rules receive the previous rule result.

## Notes

This epic describes where dependencies become available. Provider behavior such
as caching, arguments, lazy construction, decoration, and access control belongs
to the provider behavior epic.
