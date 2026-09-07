# Epic: Lifecycle hooks

- **Status:** Accepted
- **ADR:** [ADR 0007 - Lifecycle hooks via reflect-metadata and opt-in modules](../../docs/adr/0007-lifecycle-hooks.md)
- **Public API:** `hook`, `getHooks`, `hasHooks`, `HooksRunner`, `HookContext`, `createHookContext`, `createHookContextFactory`, `onConstruct`, `onConstructAsync`, `onContainerDisposed`, `injectProp`, `onResolved`, `onResolvedAsync`, `OnConstructModule`, `OnConstructAsyncModule`, `OnDisposeModule`, `OnResolvedModule`, `OnResolvedAsyncModule`, `resolved`, `resolvedAsync`
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
- `OnConstructModule` opts a container into construct hook execution.
- Construct hooks run after the instance is created and tracked.
- Hook classes are resolved through the container before execution.

### Story: Run async construct hooks

As an application developer, I can run promise-returning initialization after an
instance is constructed so that async setup does not have to be forced into the
synchronous construct path.

Acceptance criteria:

- `onConstructAsync` stores hook metadata on a method under its own hook key.
- `OnConstructAsyncModule` opts a container into async construct hook
  execution.
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
  own hook keys, and invoke the decorated method when no hook is named.
- `OnResolvedModule` and `OnResolvedAsyncModule` opt a container into resolve
  hook execution; the `resolved()` and `resolvedAsync()` pipes opt in a single
  registration instead.
- Hooks run on every resolve, and `{ once: true }` hooks run a single time per
  instance however many keys, scopes, or resolve calls return it.
- Distinct objects of the same class each get their own `once` hook run.
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

### Story: Register direct disposal callbacks on a container

As an application developer, I can attach disposal callbacks directly to a
container so that cleanup logic runs when the container is disposed without
needing a class decorated with `@onContainerDisposed`.

Acceptance criteria:

- `onDispose` registers a callback that receives the disposing container.
- The callback is invoked when the container is disposed.
- `onDispose` returns the container for fluent chaining.
- `onConstruct` and `onScopeCreated` are the matching container-level hooks, for
  newly created instances and newly created scopes, and chain the same way.
- A child scope inherits the hooks its parent held at `createScope` time.
- `EmptyContainer` rejects all three with `MethodNotImplementedError`.

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
