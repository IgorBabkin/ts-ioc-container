# Epic: Lifecycle hooks

- **Status:** Accepted
- **ADR:** [ADR 0007 - Lifecycle hooks via reflect-metadata and opt-in modules](../../../adr/0007-lifecycle-hooks.md),
  [ADR 0012 - Hook registration lives with the domain which raises the event](../../../adr/0012-hook-domains.md),
  [ADR 0013 - One async-capable hook path, no `Async` variants](../../../adr/0013-one-async-capable-hook-path.md),
  [ADR 0014 - Hook execution is a strategy, chosen by the caller](../../../adr/0014-hook-execution-strategy.md),
  [ADR 0015 - One hook per member, combined by higher-order functions](../../../adr/0015-one-hook-per-member.md),
  [ADR 0016 - The library collects hooks; the caller runs them](../../../adr/0016-collect-hooks-let-the-caller-run-them.md)
- **Public API:** `hook`, `getHooks`, `hasHooks`, `toHookFn`, `sequential`, `parallel`, `HookCollector`, `HookAction`, `HookRunner`, `toTask`, `HookContext`, `createHookExecutionContext`, `createHookContextFactory`, `onConstruct`, `onScopeDisposed`, `injectProp`, `onResolved`, `oncePerInstance`, `OnConstructModule`, `OnDisposeModule`, `OnResolvedModule`, `resolved`, `ScopeHook`, `RegisteredHook`, `InjectorHook`, `ProviderHook`, `IInjectorModule`
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

- `onConstruct` stores one hook as metadata on a method; several hooks are
  combined into one with `sequential(...)` / `parallel(...)` at the
  declaration site.
- `OnConstructModule` is a container module: it opts the container's injector
  (reached through `getInjector()`) into construct hook execution, so one
  application covers the whole scope tree.
- The module takes the `HookRunner` which performs the collected actions, and
  defaults its collector to the `onConstruct` key.
- Construct hooks run after the instance is created and tracked.
- Hook classes are resolved through the container before execution.

### Story: Run async construct hooks

As an application developer, I can run promise-returning initialization after an
instance is constructed without reaching for a separate decorator or module, so
that async setup does not have to be forced into the synchronous construct path.

Acceptance criteria:

- `onConstruct` takes an async hook under the same hook key as a sync one.
- `OnConstructModule` collects both kinds; a runner built on `runInOrder`
  awaits the async ones.
- Async construct hooks start when the instance is created and settle after
  resolution returns.
- Rejected hooks reach whatever the runner attached to the promise it was
  handed; the library reports nothing itself.

### Story: Run resolve hooks

As an application developer, I can run behavior when a dependency is resolved so
that objects the container does not construct — constants, factory results,
instances shared across keys and scopes — still get an initialization point.

Acceptance criteria:

- `onResolved` stores one hook as metadata on a method and takes a sync or an
  async one; like every other decorator, it runs nothing unless a hook is named.
- `OnResolvedModule` opts a container into resolve hook collection; the
  `resolved(runner)` pipe opts in a single registration instead. Both take the
  runner, and default their collector to the `onResolved` key.
- `onResolved` hooks run on every resolve; a hook wrapped in `oncePerInstance`
  (e.g. `onResolved(oncePerInstance(invoke))`) runs a single time per
  instance however many keys, scopes, or resolve calls return it.
- Distinct objects of the same class each get their own once-resolve hook run.
- Providers registered before the module was applied are not covered.
- Rejected async hooks reach whatever the runner attached to the promise it was
  handed; the library reports nothing itself.

### Story: Run dispose hooks

As an application developer, I can run cleanup behavior when a scope is disposed
so that local resources are released at the lifecycle boundary.

Acceptance criteria:

- `onScopeDisposed` stores hook metadata on a method.
- `OnDisposeModule` opts a container into dispose hook collection, defaulting
  its collector to the `onScopeDisposed` key, and hands the runner the actions
  of every instance of the scope as one list.
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

- `hook` records exactly one hook for a method under a key; decorating the same
  member twice under one key replaces the earlier hook.
- `getHooks` returns hook metadata for the reflected target.
- `hasHooks` identifies whether hook metadata exists.
- A `HookCollector` keyed to a custom name collects that key's hooks;
  `predicate` limits collection to accepted methods, on the collector or per
  `getActions` call.

### Story: Register imperative hooks with the domain which raises them

As an application developer, I can attach callbacks directly to the abstraction
which raises an event — scope, injector, or provider — so that cleanup, metrics,
and custom extension points do not need a decorated class, and so the place a
hook is registered says which domain owns it.

Acceptance criteria:

- Scope events are exposed on `IContainer` as typed events — `scopeCreated`,
  `scopeDisposed` (`ITypedEvent<[IContainer]>`) and `registered`
  (`ITypedEvent<[IProvider, DependencyKey, IContainer]>`). A hook is attached
  with `subscribe` and detached with the function it returns, or with
  `unsubscribe`. There are no fluent `onX(...hooks)` methods on the container.
- The exposed events carry no `emit`: only the container raises its own scope
  events.
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
- `EmptyContainer` rejects every scope event with `MethodNotImplementedError`.

### Story: Choose how hooks run

As a maintainer, I write the runner which performs the hooks a module collects,
so that a hook's being sync or async is the hook's business, and ordering,
awaiting and error reporting are mine.

Acceptance criteria:

- One hook key and one decorator per domain take sync and async hooks alike.
- `HookCollector.getActions(target, { scope })` returns one `HookAction` per
  decorated member, in declaration order, with its hook resolved to a function
  and its context built; nothing has run when it returns.
- A hook class is resolved through the scope when its action is performed, not
  while collecting.
- `toTask` turns an action into the `Task` that `runInOrder` and `runAtOnce`
  take, so a runner is a line of caller code.
- `sequential(...hooks)` runs the hooks it combines in declaration order,
  awaiting each one that goes async; `parallel(...hooks)` starts them at once.
  Both return a `HookFn`, so they nest and compose with `oncePerInstance`.
- A run stays synchronous until a hook returns a promise; `runInOrder` and
  `runAtOnce` await only what is a promise.
- A sync hook which throws throws out of the call which performed it, and an
  async one rejects the promise handed to the runner: the library catches
  neither.
- A class's hook metadata is read once per class and key, whatever collects it.
- Hook context can resolve method arguments and invoke the target method.

## Notes

Lifecycle hook execution is opt-in. Decorators record intent; modules or manual
container hooks activate execution.

`@onResolved` (the provider event) is the recommended hook for reacting to a
dependency: it covers every dependency leaving a provider, whoever produced it,
and runs after the `decorate(...)` chain. `@onConstruct` is the narrower tool —
it fires only for what the injector constructs, and before decoration.
