# ADR 0015 — One hook per member, combined by higher-order functions

- **Status:** Accepted; the strategy table below is superseded by
  [ADR 0016](0016-collect-hooks-let-the-caller-run-them.md), which replaced the
  strategies with a collector the caller runs
- **Date:** 2026-09-12
- **Deciders:** core maintainers
- **Tags:** hooks, lifecycle, api-design

## Context

[ADR 0014](0014-hook-execution-strategy.md) made hook execution a strategy, but
left the *hooks of one member* as a list: `@onConstruct(h1, h2)` stored an array
under the member's name, and the async strategies took a `methodStrategy`
(`'sequential'` | `'parallel'`) saying how that array ran. Two mechanisms
therefore described hook composition, and neither was where the hooks are
written:

- **The list is implicit.** `@onConstruct(h1, h2)` says nothing about whether
  `h2` waits for `h1`. The answer lived on a strategy constructed somewhere else
  — usually in the composition root, sometimes not even in the same package.
- **`methodStrategy` is one setting for every member of every class the
  strategy runs.** A class with one member whose hooks must be ordered and
  another whose hooks are independent could not have both.
- **Composition could not nest.** "Run these two at once, then this one" was
  not expressible at all; `methodStrategy` picks one shape for the whole list.
- **Stacked decorators needed their own rules.** Because a member accumulated
  hooks, `@onConstruct` had to `prependHooks` to compensate for the bottom-up
  application order, and the generic `@hook` took a
  `MapHooksFn = (...prev: HookType[]) => HookType[]` with `appendHooks` /
  `prependHooks` helpers — a second, list-shaped composition API.

## Decision

**A member carries exactly one hook per key**, and hooks are combined by
higher-order functions at the declaration site.

```typescript
class OrderService {
  @hook('actions', sequential(authorize, validate, persist))
  submit() {}

  @onScopeDisposed(oncePerInstance(parallel(flushMetrics, closeSocket)))
  destroy() {}
}
```

- `HooksOfClass` is `Map<string, HookType>`, not `Map<string, HookType[]>`.
- `hook(key, hook)`, `onConstruct(hook)`, `onScopeDisposed(hook)` and
  `onResolved(hook)` each take a single `HookType` — a hook function or a hook
  class, as before.
- `sequential(...hooks)` runs them in declaration order, staying synchronous
  until one returns a promise and awaiting the rest from that point.
  `parallel(...hooks)` starts them all at once. Both return a plain `HookFn`,
  so they nest freely and compose with `oncePerInstance`, and a user-written
  combinator needs nothing but `toHookFn`.
- `methodStrategy` and the `AsyncHookExecutionStrategy` base class that carried
  it are gone. A strategy now answers exactly one question about ordering: how
  the **members** — the decorated methods — relate.

| Strategy          | Members (decorated methods) | Awaits |
| ----------------- | --------------------------- | ------ |
| `SequentialSync`  | one after another           | no     |
| `SequentialAsync` | one after another           | yes    |
| `ParallelAsync`   | all at once                 | yes    |

The sync-until-async primitives ADR 0013 introduced did not change; they moved
to `lib/utils/task.ts` as `runInOrder` / `runAtOnce` over a `Task =
() => void | Promise<void>`, and both levels are built on them — the
combinators over one member's hooks, the strategies over the members.

### Stacked decorators replace rather than accumulate

With one hook per member, decorating a member twice under the same key keeps
the last hook written to the metadata. Decorators are applied bottom-up, so the
topmost decorator is the one that stays. `appendHooks`, `prependHooks`, their
`append` / `prepend` aliases and the `MapHooksFn` type are removed: the reason
they existed — an accumulating list — is gone, and `sequential(...)` expresses
the same intent where the hooks are.

## Consequences

**Positive**

- How a member's hooks relate is read off the declaration, not inferred from a
  strategy constructed elsewhere.
- Composition nests: `sequential(a, parallel(b, c), d)` is ordinary function
  composition, and `oncePerInstance(sequential(...))` wraps a whole sequence.
- Per-member choice: one class can order one member's hooks and run another's
  at once, which `methodStrategy` made impossible.
- One composition API instead of two — the map-function layer disappears, and a
  custom combinator is just a function returning a `HookFn`.
- Strategies shrink to the single ordering question they own, and
  `AsyncHookExecutionStrategy` disappears with the setting it existed to carry.

**Negative / trade-offs**

- Breaking change with no shim: `@onConstruct(h1, h2)` and friends no longer
  take several hooks, stacked decorators no longer accumulate,
  `appendHooks` / `prependHooks` / `append` / `prepend` / `MapHooksFn`,
  `AsyncHookExecutionStrategy`, `AsyncHookExecutionStrategyProps` and
  `MethodStrategy` are gone, and `MemberHooks` is now `MemberHook`.
- A second `@hook` on the same member silently replaces the first instead of
  adding to it — a quiet change for code which relied on accumulation.
- Hooks contributed from two places (a base class decorator and a derived one,
  or two libraries) can no longer be merged by the metadata layer; whoever
  declares the member composes them explicitly.

## References

- `lib/hooks/hook.ts` — `HookType`, `HooksOfClass`, `hook`, `toHookFn`
- `lib/hooks/combinators.ts` — `sequential`, `parallel`, `oncePerInstance`
- `lib/utils/task.ts` — `Task`, `runInOrder`, `runAtOnce`
- `lib/hooks/HookExecutionStrategy.ts` — `MemberHook`
- `lib/hooks/SequentialSync.ts`, `lib/hooks/SequentialAsync.ts`, `lib/hooks/ParallelAsync.ts`
- `__tests__/hooks/hook.spec.ts`, `__tests__/hooks/HookExecutionStrategy.spec.ts`, `__tests__/specs/lifecycle-hooks.spec.ts`
- [ADR 0013 — One async-capable hook path, no `Async` variants](0013-one-async-capable-hook-path.md)
- [ADR 0014 — Hook execution is a strategy, chosen by the caller](0014-hook-execution-strategy.md)
