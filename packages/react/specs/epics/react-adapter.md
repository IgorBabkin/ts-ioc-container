# Epic: React adapter

- **Status:** Proposed
- **ADR:** [ADR 0001 - Container as a linked list of scopes](../../../../docs/adr/0001-container-as-linked-list.md)
- **Public API:** `ScopeContext`, `Scope`, `useScopeOrFail`, `useResolveOrFail`, `OutOfScopeError`
- **Package:** `@ts-ioc-container/react`
- **Executable spec:** `packages/react/__tests__/specs/react-adapter.spec.tsx`

## Intent

As a React application developer, I want the container's scope chain to follow
the component tree so that a component subtree resolves from its own scope and
that scope dies with the subtree.

## Stories

### Story: Bind a container to a component subtree

As a React developer, I can put a container into the React tree so that every
component below it resolves from that container.

Acceptance criteria:

- `ScopeContext` is a React context whose value is an `IContainer` or `null`.
- A component under `ScopeContext.Provider` reads that exact container through
  `useScopeOrFail`.

### Story: Create a child scope per subtree

As a React developer, I can wrap a subtree in `Scope` so that the subtree gets
its own child container created from the surrounding scope.

Acceptance criteria:

- `Scope` creates the child scope from the surrounding scope with the given
  `tags`, passing each tag through unchanged.
- The child scope is created once per mounted `Scope` instance: re-rendering
  does not replace it.
- Nested `Scope` components form a matching chain of child containers.
- The child scope is disposed when the `Scope` component unmounts.
- A `Scope` rendered without a surrounding scope fails with `OutOfScopeError`.

### Story: Resolve dependencies from the surrounding scope

As a React developer, I can resolve a dependency inside a component so that the
component gets the instance registered for its own scope.

Acceptance criteria:

- `useResolveOrFail` resolves an `InjectionToken` through the surrounding scope.
- `useResolveOrFail` resolves a class constructor through the surrounding scope.
- Resolution failures from the container (for example
  `DependencyNotFoundError`) surface unchanged — the adapter does not wrap them.

### Story: Fail clearly outside a scope

As a React developer, I get a specific error when a hook is used outside any
scope so that a missing provider is easy to diagnose.

Acceptance criteria:

- `useScopeOrFail` fails with `OutOfScopeError` when no `ScopeContext.Provider`
  is above it.
- `useResolveOrFail` fails with the same `OutOfScopeError` in that situation.
- `OutOfScopeError` is an `Error` with `name === 'OutOfScopeError'` and survives
  `instanceof` across the package boundary.

## Notes

- Non-goals: controller lifecycle hooks, error boundaries, and suspense
  integration. The adapter exposes the scope chain and resolution only; app
  specific wiring stays in the application.
- Changing `tags`, or the surrounding scope, after a `Scope` has mounted does
  not recreate its child scope. Remount the subtree (for example with a React
  `key`) when the scope identity should change.
- `Scope` is not safe under React `StrictMode`. StrictMode's dev-only
  mount/unmount/remount cycle disposes the scope created on mount and then
  re-runs the effect's setup without a render pass to create a replacement,
  leaving the subtree on a disposed scope. Render the app root outside
  `StrictMode`, or keep `StrictMode` scoped to trees that don't mount `Scope`.
