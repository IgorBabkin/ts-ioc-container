# Epic: Container modules

- **Status:** Accepted
- **ADR:** [ADR 0007 - Lifecycle hooks via reflect-metadata and opt-in modules](../../docs/adr/0007-lifecycle-hooks.md)
- **Public API:** `IContainerModule`, `Container.useModule`, `AutoResolveModule`, `AutoResolveToken`
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

As an application developer, I can opt into lifecycle hooks by writing a module
over the container's own events, so that projects that need hooks enable them
explicitly and the library ships none.

Acceptance criteria:

- `IContainerModule` is one method — `applyTo(container)` — so a lifecycle
  module is a function returning an object literal; the library ships no hook
  module of its own (ADR 0018).
- A module subscribing to `scopeDisposed` collects from the instances tracked by
  the disposed scope.
- A module subscribing to `registered` covers every provider registered after it
  is applied, and none registered before.
- Child scopes created after module setup inherit the lifecycle hooks configured
  on the parent.
- Construct hooks are not a container concern: they are wired on the injector,
  reached through `getInjector()`. See the lifecycle-hooks epic.

### Story: Eagerly instantiate scope services through a module

As an application architect, I can opt into eager resolution through a module so
that services which work on their own — schedulers, subscribers, warm caches —
exist as soon as their scope does, without anyone injecting them first.

Acceptance criteria:

- A service is marked eager by binding it to the `AutoResolveToken` alias
  (`@register(AutoResolveToken)`); the core has no auto-resolve flag on providers
  or containers.
- `AutoResolveModule` resolves the `AutoResolveToken` group of every scope
  created after the module was applied; without the module the alias changes
  nothing.
- Only the created scope's own providers are resolved (`shallow`), so a provider
  registered in a parent is not resolved again for every descendant scope.
- Child scopes inherit eager resolution from the scope they were created in.
- Providers that are not registered in a created scope, or that deny access to
  it, are skipped instead of failing scope creation.
- Eager creation reuses the provider's own caching, so a singleton provider
  returns the eagerly created instance for later resolution.
- The container the module is applied to is not itself a created scope; its own
  eager providers are resolved by `AutoResolveToken.resolve(container)`.
- Eager resolution options are optional; when `args` are supplied they are
  forwarded to every eagerly resolved provider of every created scope.

## Notes

Modules are a composition mechanism. They should not create a second dependency
configuration model; they should apply normal registrations, hooks, and
container operations.
