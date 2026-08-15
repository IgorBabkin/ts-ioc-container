# Epic: Injector strategies

- **Status:** Accepted
- **ADR:** [ADR 0002 - Pluggable injector strategies](../../docs/adr/0002-pluggable-injectors.md)
- **Public API:** `IInjector`, `Injector`, `MetadataInjector`, `SimpleInjector`, `ProxyInjector`, `inject`, `resolveArgs`, `args`, `argsFn`
- **Executable spec:** `__tests__/specs/injector-strategies.spec.ts`

## Intent

As a developer in different TypeScript environments, I want multiple injection
strategies so that I can use decorator metadata, direct container access,
proxy-style access, or a custom construction strategy.

## Stories

### Story: Resolve constructor metadata

As a decorator-friendly TypeScript user, I want injection to be explicit, so
that only constructor parameters annotated with `@inject` (or its derivatives
like `args` / `argsFn`) are resolved by the container.

Acceptance criteria:

- `@inject` records an injection token for a constructor parameter.
- `MetadataInjector` resolves annotated constructor arguments from the
  container.
- Constructor parameters without `@inject` metadata resolve to `undefined`.

### Story: Inject positional runtime arguments

As a library user, I can map runtime arguments into constructor parameters so
that a dependency can be configured at resolution time.

Acceptance criteria:

- `args(index)` selects a runtime argument by position.
- `argsFn` maps the full runtime argument list to one injected value.
- Missing positional runtime arguments resolve as `undefined`.

### Story: Use direct container injection

As a user who avoids decorators, I can use a simple injector so that classes can
receive the container and resolve dynamic dependencies explicitly.

Acceptance criteria:

- `SimpleInjector` passes the container as the first constructor argument.
- `SimpleInjector` appends caller-supplied arguments after the container.
- Instances created by `SimpleInjector` are tracked by the resolving scope.

### Story: Use proxy-based injection

As a user who wants property-style dependency access, I can use a proxy injector
so that constructor code can access dependencies through a provided object.

Acceptance criteria:

- `ProxyInjector` resolves normal properties by dependency key.
- `ProxyInjector` exposes runtime arguments through its reserved args property.
- `ProxyInjector` resolves properties containing the alias convention through
  alias-group resolution.

### Story: Extend construction behavior

As a library integrator, I can provide a custom injector so that construction
can follow framework-specific rules.

Acceptance criteria:

- A container can be constructed with a custom injector.
- The custom injector receives the resolving container, target constructor, and
  provider options.
- Instances created through the custom injector participate in normal instance
  tracking and lifecycle behavior.

## Notes

This epic focuses on construction strategy. Provider configuration and token
composition are covered by separate epics.
