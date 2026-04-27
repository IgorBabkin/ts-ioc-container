# Epic: Dependency resolution

- **Status:** Accepted
- **ADR:** [ADR 0011 - Spec-driven development workflow](../../docs/adr/0011-spec-driven-development.md)
- **Public API:** `Container`, `Registration`, `register`, `inject`, `resolve`
- **Executable spec:** `__tests__/specs/dependency-resolution.spec.ts`
- **Benchmarks:**
  `__benchmarks__/specs/dependency-resolution.ts-ioc-container.bench.ts`,
  `__benchmarks__/specs/dependency-resolution.tsyringe.bench.ts`

## Intent

As a TypeScript application developer, I want to register dependencies and
resolve them through a container so that application objects can depend on
interfaces, keys, or classes instead of constructing all collaborators manually.

## Stories

### Story: Resolve a registered dependency

As a library user, I can bind a provider to a key and resolve that key from the
container.

Acceptance criteria:

- A class registration bound to a key resolves an instance of that class.
- Constructor dependencies marked with `@inject` are resolved from the same
  container context.
- Singleton provider behavior returns the same collaborator when the same key is
  resolved repeatedly in the same scope.

Benchmark coverage:

- `__benchmarks__/specs/dependency-resolution.ts-ioc-container.bench.ts` and
  `__benchmarks__/specs/dependency-resolution.tsyringe.bench.ts` measure this
  story through equivalent public API usage, while keeping each library in its
  own TypeScript module.

### Story: Fail clearly when dependency resolution is impossible

As a library user, I get a specific error when I ask for a dependency that is
not registered or visible.

Acceptance criteria:

- Resolving a missing key throws `DependencyNotFoundError`.
- Resolving from a disposed container throws `ContainerDisposedError`.
- A disposed container cannot be reused as a resolution context.

### Story: Query whether a dependency is registered

As a library user, I can check whether a key is registered in a container so
that conditional registration and guard logic can avoid unnecessary resolution
attempts.

Acceptance criteria:

- `hasRegistration` returns `true` when the key has at least one visible
  registration in the container or its parent chain.
- `hasRegistration` returns `false` when no registration exists for that key.
- `hasRegistration` accepts string and symbol keys.
- `hasRegistration` returns `false` after the container is disposed.

## Notes

This spec covers observable behavior only. Tests in feature folders can still
cover provider internals, injector internals, and lower-level regression cases.
