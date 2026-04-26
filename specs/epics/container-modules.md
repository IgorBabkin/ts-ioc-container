# Epic: Container modules

- **Status:** Proposed
- **ADR:** [ADR 0007 - Lifecycle hooks via reflect-metadata and opt-in modules](../../docs/adr/0007-lifecycle-hooks.md)
- **Public API:** `IContainerModule`, `Container.useModule`, `AddOnConstructHookModule`, `AddOnDisposeHookModule`
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

- `AddOnConstructHookModule` enables construct hook execution for future
  instances in the container.
- `AddOnDisposeHookModule` enables dispose hook execution for instances tracked
  by the disposed scope.
- Child scopes created after module setup inherit the lifecycle hooks configured
  on the parent.

## Notes

Modules are a composition mechanism. They should not create a second dependency
configuration model; they should apply normal registrations, hooks, and
container operations.
