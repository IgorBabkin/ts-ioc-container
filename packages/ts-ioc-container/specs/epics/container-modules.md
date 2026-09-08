# Epic: Container modules

- **Status:** Accepted
- **ADR:** [ADR 0007 - Lifecycle hooks via reflect-metadata and opt-in modules](../../docs/adr/0007-lifecycle-hooks.md)
- **Public API:** `IContainerModule`, `Container.useModule`, `OnResolvedModule`, `OnResolvedAsyncModule`, `OnDisposeModule`, `AutoResolveModule`, `Container.autoResolve`
- **Executable spec:** `__tests__/specs/container-modules.spec.ts`

## Intent

As an application architect, I want dependency configuration to be packaged into
modules so that features, environments, and lifecycle concerns can be composed
without repeating container setup code.

## Stories

### Story: Apply a module to a container

As a library user, I can apply a module to a container so that dependency setup
can be reused.

Acceptance criteria:

- `useModule` passes the container to the module's `applyTo` method.
- A module can add registrations to the target container.
- `useModule` returns the container for fluent composition.

### Story: Compose multiple modules

As an application architect, I can apply multiple modules so that independent
feature configurations can be assembled into one application container.

Acceptance criteria:

- Multiple modules can contribute registrations to the same container.
- Later modules can add registrations without removing earlier module
  registrations.
- Environment-specific modules can choose different implementations for the
  same dependency role.

### Story: Enable lifecycle behavior through modules

As an application developer, I can opt into lifecycle hooks through modules so
that projects that need hooks can enable them explicitly.

Acceptance criteria:

- `OnResolvedModule` enables resolve hook execution for providers registered in
  the container afterwards.
- `OnDisposeModule` enables dispose hook execution for instances tracked
  by the disposed scope.
- Child scopes created after module setup inherit the lifecycle hooks configured
  on the parent.

### Story: Eagerly instantiate scope services through a module

As an application architect, I can opt into eager resolution through a module so
that services marked with `autoResolve()` are created as soon as a scope exists.

Acceptance criteria:

- `AutoResolveModule` resolves auto-resolvable providers of every scope created
  after the module was applied.
- Child scopes inherit eager resolution from the scope they were created in.
- Providers that are not registered in a created scope, or that deny access to
  it, are skipped instead of failing scope creation.
- The container the module is applied to is not itself a created scope; its own
  providers are resolved eagerly only by calling `autoResolve()` on it.
- Eager resolution options are optional; when `args` are supplied they are
  forwarded to every eagerly resolved provider of every created scope.

## Notes

Modules are a composition mechanism. They should not create a second dependency
configuration model; they should apply normal registrations, hooks, and
container operations.
