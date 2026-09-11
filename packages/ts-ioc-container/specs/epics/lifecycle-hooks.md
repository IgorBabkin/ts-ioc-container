# Epic: Lifecycle hooks

- **Status:** Accepted
- **ADR:** [ADR 0007 - Lifecycle hooks via reflect-metadata and opt-in modules](../../../adr/0007-lifecycle-hooks.md),
  [ADR 0012 - Hook registration lives with the domain which raises the event](../../../adr/0012-hook-domains.md),
  [ADR 0013 - One async-capable hook path, no `Async` variants](../../../adr/0013-one-async-capable-hook-path.md),
  [ADR 0014 - Hook execution is a strategy, chosen by the caller](../../../adr/0014-hook-execution-strategy.md)
- **Public API:** `hook`, `getHooks`, `hasHooks`, `HookExecutionStrategy`, `SequentialSync`, `SequentialAsync`, `ParallelAsync`, `HookContext`, `createHookExecutionContext`, `createHookContextFactory`, `onConstruct`, `onScopeDisposed`, `injectProp`, `onResolved`, `oncePerInstance`, `OnConstructModule`, `OnDisposeModule`, `OnResolvedModule`, `resolved`, `ScopeHook`, `RegisteredHook`, `InjectorHook`, `ProviderHook`, `IInjectorModule`
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
- `OnConstructModule` is a container module: it opts the container's injector
  (reached through `getInjector()`) into construct hook execution, so one
  application covers the whole scope tree.
- The module takes the `HookExecutionStrategy` which runs the hooks; the
  strategy is keyed to `onConstruct`.
- Construct hooks run after the instance is created and tracked.
- Hook classes are resolved through the container before execution.

### Story: Run async construct hooks

As an application developer, I can run promise-returning initialization after an
instance is constructed without reaching for a separate decorator or module, so
that async setup does not have to be forced into the synchronous construct path.

Acceptance criteria:

- `onConstruct` takes async hooks under the same hook key as sync ones.
- `OnConstructModule` runs both kinds; an async strategy awaits the async ones.
- Async construct hooks start when the instance is created and settle after
  resolution returns.
- Rejected hooks are reported to the strategy `onError` handler when one is
  provided.

### Story: Run resolve hooks

As an application developer, I can run behavior when a dependency is resolved so
that objects the container does not construct — constants, factory results,
instances shared across keys and scopes — still get an initialization point.

Acceptance criteria:

- `onResolved` stores hook metadata on a method and takes sync and async hooks
  as a rest parameter; like every other decorator, it runs nothing unless a hook
  is named.
- `OnResolvedModule` opts a container into resolve hook execution; the
  `resolved(strategy)` pipe opts in a single registration instead. Both take
  the strategy keyed to `onResolved`.
- `onResolved` hooks run on every resolve; a hook wrapped in `oncePerInstance`
  (e.g. `onResolved(oncePerInstance(invoke))`) runs a single time per
  instance however many keys, scopes, or resolve calls return it.
- Distinct objects of the same class each get their own once-resolve hook run.
- Providers registered before the module was applied are not covered.
- Rejected async hooks are reported to the strategy `onError` handler when one
  is provided.

### Story: Run dispose hooks

As an application developer, I can run cleanup behavior when a scope is disposed
so that local resources are released at the lifecycle boundary.

Acceptance criteria:

- `onScopeDisposed` stores hook metadata on a method.
- `OnDisposeModule` opts a container into dispose hook execution, with the
  strategy keyed to `onScopeDisposed`.
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

As a framework integrator, I can define custom hook keys and run them with the
same strategies as the built-in hooks so that extension points reuse one
metadata and execution model.

Acceptance criteria:

- `hook` records one or more hook functions for a method.
- `getHooks` returns hook metadata for the reflected target.
- `hasHooks` identifies whether hook metadata exists.
- A `HookExecutionStrategy` keyed to a custom name executes that key's hooks;
  `predicate` limits the run to accepted methods, on the strategy or per call.

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
  InjectorHook[])`, reached through `container.getInjector()` or configured
  before the injector is passed to `new Container({ injector })`.
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

### Story: Choose how hooks run

As a maintainer, I pick a hook execution strategy per module so that a hook's
being sync or async is the hook's business, and ordering, awaiting and error
reporting are the caller's.

Acceptance criteria:

- One hook key and one decorator per domain take sync and async hooks alike.
- `SequentialSync` runs members and their hooks one after
  another and never awaits; everything it ran has finished when `execute`
  returns.
- `SequentialAsync` runs members one after another,
  awaiting each; `ParallelAsync` starts every member at
  once. `methodStrategy: 'parallel'` starts the hooks of one member at once
  instead of in declaration order.
- A run stays synchronous until a hook returns a promise; the async strategies
  await only what is a promise.
- `execute` returns `void`; async hooks settle after it returns.
- A class's hook metadata is read and resolved to hook functions once per
  strategy.
- A strategy reports both a sync throw and a rejected async hook to its
  `onError` handler, and drops both when none is supplied.
- Hook context can resolve method arguments and invoke the target method.

## Notes

Lifecycle hook execution is opt-in. Decorators record intent; modules or manual
container hooks activate execution.
