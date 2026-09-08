# Epic: Lifecycle hooks

- **Status:** Accepted
- **ADR:** [ADR 0007 - Lifecycle hooks via reflect-metadata and opt-in modules](../../../adr/0007-lifecycle-hooks.md),
  [ADR 0012 - Hook registration lives with the domain which raises the event](../../../adr/0012-hook-domains.md)
- **Public API:** `hook`, `getHooks`, `hasHooks`, `HooksRunner`, `HookContext`, `createHookContext`, `createHookContextFactory`, `onConstruct`, `onConstructAsync`, `onContainerDisposed`, `injectProp`, `onResolved`, `onceResolved`, `onResolvedAsync`, `onceResolvedAsync`, `OnConstructModule`, `OnConstructAsyncModule`, `OnDisposeModule`, `OnResolvedModule`, `OnResolvedAsyncModule`, `resolved`, `resolvedAsync`, `ScopeHook`, `RegisteredHook`, `InjectorHook`, `ProviderHook`, `IInjectorModule`
- **Executable spec:** `__tests__/specs/lifecycle-hooks.spec.ts`

## Intent

As an application developer, I want lifecycle hooks for initialization,
cleanup, property injection, and custom extension points so that services can
manage resources around container-owned lifecycles.

## Stories

### Story: Run construct hooks

As an application developer, I can run initialization behavior after an
instance is constructed so that dependencies are ready before the service is
used.

Acceptance criteria:

- `onConstruct` stores hook metadata on a method.
- `OnConstructModule` is an injector module: it opts an injector into construct
  hook execution, and that injector is then passed to the container.
- Construct hooks run after the instance is created and tracked.
- Hook classes are resolved through the container before execution.

### Story: Run async construct hooks

As an application developer, I can run promise-returning initialization after an
instance is constructed so that async setup does not have to be forced into the
synchronous construct path.

Acceptance criteria:

- `onConstructAsync` stores hook metadata on a method under its own hook key.
- `OnConstructAsyncModule` is an injector module opting an injector into async
  construct hook execution.
- Async construct hooks start when the instance is created and settle after
  resolution returns.
- Rejected hooks are reported to the module `onException` handler when one is
  provided.

### Story: Run resolve hooks

As an application developer, I can run behavior when a dependency is resolved so
that objects the container does not construct — constants, factory results,
instances shared across keys and scopes — still get an initialization point.

Acceptance criteria:

- `onResolved` and `onResolvedAsync` store hook metadata on a method under their
  own hook keys, take hooks as a rest parameter, and invoke the decorated method
  when no hook is named.
- `OnResolvedModule` and `OnResolvedAsyncModule` opt a container into resolve
  hook execution; the `resolved()` and `resolvedAsync()` pipes opt in a single
  registration instead.
- `onResolved` hooks run on every resolve; `onceResolved` and `onceResolvedAsync`
  hooks run a single time per instance however many keys, scopes, or resolve
  calls return it.
- Distinct objects of the same class each get their own once-resolve hook run.
- Providers registered before the module was applied are not covered.
- Rejected async hooks are reported to the module `onException` handler when one
  is provided.

### Story: Run dispose hooks

As an application developer, I can run cleanup behavior when a scope is disposed
so that local resources are released at the lifecycle boundary.

Acceptance criteria:

- `onContainerDisposed` stores hook metadata on a method.
- `OnDisposeModule` opts a container into dispose hook execution.
- Dispose hooks run for instances tracked by the disposed scope.
- Disposing a scope does not implicitly run hooks for child scopes.

### Story: Inject properties through hooks

As a library user, I can populate properties with dependency values so that
legacy or framework-owned objects can receive dependencies after construction.

Acceptance criteria:

- `injectProp` resolves the configured token from the hook context scope.
- `injectProp` assigns the resolved value to the decorated property.
- Property injection participates in normal token conversion rules.

### Story: Execute custom hooks

As a framework integrator, I can define custom hook keys and runners so that
extension points can reuse the same metadata and execution model.

Acceptance criteria:

- `hook` records one or more hook functions for a method.
- `getHooks` returns hook metadata for the reflected target.
- `hasHooks` identifies whether hook metadata exists.
- `HooksRunner` can execute only methods accepted by a predicate.

### Story: Register imperative hooks with the domain which raises them

As an application developer, I can attach callbacks directly to the abstraction
which raises an event — scope, injector, or provider — so that cleanup, metrics,
and custom extension points do not need a decorated class, and so the place a
hook is registered says which domain owns it.

Acceptance criteria:

- Scope events are registered on `IContainer`: `onScopeCreated(...hooks:
  ScopeHook[])`, `onScopeDisposed(...hooks: ScopeHook[])` and
  `onRegistered(...hooks: RegisteredHook[])`, each returning the
  container for fluent chaining.
- Construction is registered on `IInjector`: `onConstructed(...hooks:
  InjectorHook[])`. The injector is configured before it is passed to
  `new Container({ injector })`; a container never hands its injector out.
- `IInjectorModule` bundles injector hooks, applied with `injector.useModule(...)`
  or `module.applyTo(injector)`.
- Resolution is registered on `IProvider`: `onResolved(...hooks:
  ProviderHook[])`, or on a registration through the `onResolve(...)` pipe.
- `onScopeDisposed` callbacks receive the disposing scope.
- A child scope inherits the scope hooks its parent held at `createScope` time;
  later additions to either stay local to it.
- A container passes its injector to every scope it creates, so an
  `onConstructed` hook observes construction anywhere in that scope tree,
  whenever it was added.
- Disposing a scope clears its own scope hooks and leaves the shared injector's
  hooks intact.
- `EmptyContainer` rejects every scope hook method with
  `MethodNotImplementedError`.

### Story: Handle sync and async hook execution

As a maintainer, I can choose synchronous or asynchronous hook execution so
that promise-returning hooks are handled deliberately.

Acceptance criteria:

- Synchronous hook execution rejects promise results with
  `UnexpectedHookResultError`.
- Asynchronous hook execution awaits promise and non-promise hook results.
- Hook context can resolve method arguments and invoke the target method.

## Notes

Lifecycle hook execution is opt-in. Decorators record intent; modules or manual
container hooks activate execution.
