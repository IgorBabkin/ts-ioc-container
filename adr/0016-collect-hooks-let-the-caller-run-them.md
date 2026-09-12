# ADR 0016 — The library collects hooks; the caller runs them

- **Status:** Accepted, supersedes
  [ADR 0014](0014-hook-execution-strategy.md)'s strategy classes; completed by
  [ADR 0017](0017-no-predefined-hook-keys.md), which removed the hook keys and
  decorators this ADR still assumed, and reverted the memoization below
- **Date:** 2026-09-12
- **Deciders:** core maintainers
- **Tags:** hooks, lifecycle, api-design

## Context

[ADR 0014](0014-hook-execution-strategy.md) moved the _how_ of hook execution
out of a fixed runner and into a strategy object chosen by the caller;
[ADR 0015](0015-one-hook-per-member.md) moved the composition of one member's
hooks to the declaration site, leaving a strategy with a single question: how
the **members** relate. Three classes then existed to answer it —
`SequentialSync`, `SequentialAsync`, `ParallelAsync` — and each was a thin
wrapper over `runInOrder` / `runAtOnce`, which the library already exported.

What remained was a container library shipping a small execution framework:

- **Three classes for three one-liners.** `SequentialSync.processHooks` is a
  `for` loop; the other two are `runInOrder(...)` and `runAtOnce(...)` over the
  same array. A caller wanting anything else — a cap on concurrency, a retry, a
  timeout, an ordering by member name, hooks batched per instance — could not
  express it, despite having every primitive needed to write it.
- **Error handling had to be reinvented inside the library.** `onError` existed
  only because `execute` swallowed both a sync throw and an async rejection;
  the library had to catch what it could not meaningfully handle, and dropped
  it when no handler was given.
- **`execute` hid the model.** The thing a strategy actually built — the hooks
  of a target, resolved to functions, each bound to its own context — was a
  private local, so the only way to use it was to hand control over.
- **Two owners of "how".** A module took a strategy which was keyed, so the key
  had to be repeated at a construction site that already knew it
  (`new OnConstructModule(new SequentialSync({ key: 'onConstruct' }))`), and a
  mismatch between the two silently ran nothing.

## Decision

**The library collects; the caller runs.** There is one collector and no
executor.

`HookCollector` is keyed to one hook key and exposes one question:

```typescript
const collector = new HookCollector({ key: 'onStart' });
const actions = collector.getActions(instance, { scope });
```

`getActions` returns a `HookAction[]` — one per decorated member, in
declaration order:

```typescript
type HookAction = {
  hook: HookFn; // a hook class is already resolved to a function
  context: IHookContext; // built, mapped, and bound to the target, scope and member
};
```

That is the whole model, and it is inert: nothing has run when `getActions`
returns. `toTask(action)` turns one into the `Task` that `runInOrder` /
`runAtOnce` take, so the three deleted strategies are three lines of caller
code:

```typescript
const immediate: HookRunner = (actions) => {
  for (const { hook, context } of actions) hook(context);
};
const inOrder: HookRunner = (actions) => void runInOrder(actions.map(toTask));
const atOnce: HookRunner = (actions) => void runAtOnce(actions.map(toTask));
```

Each module takes that runner and the collector to read with:

```typescript
const container = new Container()
  .useModule(new OnConstructModule(immediate, new HookCollector({ key: 'onConstruct' })))
  .useModule(new OnDisposeModule(atOnce, new HookCollector({ key: 'onScopeDisposed' })))
  .useModule(new OnResolvedModule(inOrder, new HookCollector({ key: 'onResolved', predicate })));
```

(ADR 0017 made that collector argument required; this ADR shipped with each
module defaulting it to its own key.)

### What the modules still own, and what they gave up

A module owns the wiring of a domain event to a collection (ADR 0012): the
injector's `onConstructed`, the scope's `scopeDisposed`, a provider's
`onResolved`. It no longer owns anything about running:

- **`onError` is gone.** Nothing in the library catches what a hook throws or
  rejects with. A runner which neither guards nor awaits lets a sync throw
  propagate out of `resolve` / `dispose` — loud by default, where the strategy
  silently dropped it.
- **`OnDisposeModule` collects across instances.** It flattens the actions of
  every instance of the disposed scope into one list, so the runner orders the
  _instances_ as well as the members — a choice no strategy could express,
  since `execute` was called once per instance.
- **A runner is not called when nothing was collected**, so a runner never has
  to guard for an empty list.

### Collecting stays cheap

The per-strategy cache of resolved hooks is gone, and nothing replaces it inside
the library: [ADR 0017](0017-no-predefined-hook-keys.md) settled that caching is
the caller's decision too. `getHooks` merges the prototype chain on each call and
returns a fresh map; a caller which collects often wraps it in the exported
`memoize` (`lib/utils/memoize.ts`). Hook metadata is fixed once a class is
defined, so memoizing it is always safe.

## Consequences

**Positive**

- The library answers what it knows (which hooks a class declares, and against
  what context they run) and stops where it was guessing (order, awaiting,
  failure policy, concurrency).
- Any execution policy is expressible without the library's cooperation, in
  ordinary code over an ordinary array.
- Failures surface by default instead of being dropped by a missing handler.
- Three classes, one abstract base and the `OnErrorHandler` /
  `HookExecutionContext` / `HookExecutionOptions` / `HookExecutionStrategyProps`
  types collapse into one class and two types (`HookAction`, `HookRunner`).
- `getHooks` is a plain function again, and the `memoize` util lets any caller
  cache it — including callers the strategy-local cache never served.

**Negative / trade-offs**

- Breaking change with no shim: `HookExecutionStrategy`, `SequentialSync`,
  `SequentialAsync`, `ParallelAsync`, `OnErrorHandler` and the strategy props
  types are gone, modules take `(runner, collector?)` instead of a strategy,
  and `resolved(strategy)` becomes `resolved(runner, collector?)`.
- The common cases cost a line of user code each, and every consumer writes
  that line. The README carries the three of them to copy.
- A careless runner is a footgun the strategies prevented: forgetting to guard
  turns a throwing `@onConstruct` hook into a failing `resolve`, and forgetting
  `?.catch` turns a rejecting one into an unhandled rejection.
- `MemberHook` is renamed `HookAction`, and the `methodName` it carried is gone
  — `context.methodName` already held it; code which destructured the old type
  by name must follow.

## References

- `lib/hooks/HookCollector.ts` — `HookCollector`, `HookAction`, `HookRunner`, `toTask`
- `lib/hooks/hook.ts` — memoized `getHooks`
- `lib/utils/memoize.ts` — `memoize`
- `lib/utils/task.ts` — `Task`, `runInOrder`, `runAtOnce`
- `lib/hooks/onConstruct.ts`, `lib/hooks/onScopeDisposed.ts`, `lib/hooks/onResolved.ts`
- `__tests__/hooks/HookCollector.spec.ts`, `__tests__/hooks/runners.ts`, `__tests__/specs/lifecycle-hooks.spec.ts`
- [ADR 0014 — Hook execution is a strategy, chosen by the caller](0014-hook-execution-strategy.md)
- [ADR 0015 — One hook per member, combined by higher-order functions](0015-one-hook-per-member.md)
