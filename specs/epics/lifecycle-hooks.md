# Epic: Lifecycle hooks

- **Status:** Proposed
- **ADR:** [ADR 0007 - Lifecycle hooks via reflect-metadata and opt-in modules](../../docs/adr/0007-lifecycle-hooks.md)
- **Public API:** `hook`, `getHooks`, `hasHooks`, `HooksRunner`, `HookContext`, `createHookContext`, `createHookContextFactory`, `onConstruct`, `onDispose`, `injectProp`, `AddOnConstructHookModule`, `AddOnDisposeHookModule`
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
- `AddOnConstructHookModule` opts a container into construct hook execution.
- Construct hooks run after the instance is created and tracked.
- Hook classes are resolved through the container before execution.

### Story: Run dispose hooks

As an application developer, I can run cleanup behavior when a scope is disposed
so that local resources are released at the lifecycle boundary.

Acceptance criteria:

- `onDispose` stores hook metadata on a method.
- `AddOnDisposeHookModule` opts a container into dispose hook execution.
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
