# ADR 0013 — One async-capable hook path, no `Async` variants

- **Status:** Accepted
- **Date:** 2026-09-08
- **Deciders:** core maintainers
- **Tags:** hooks, lifecycle, api-design

## Context

[ADR 0007](0007-lifecycle-hooks.md) noted that "async hooks require explicit
async execution support and cannot be hidden in the synchronous path", and the
library took that literally. Every hook domain shipped twice:

| Sync                | Async                     |
| ------------------- | ------------------------- |
| `@onConstruct`      | `@onConstructAsync`       |
| `OnConstructModule` | `OnConstructAsyncModule`  |
| `@onResolved`       | `@onResolvedAsync`        |
| `@onceResolved`     | `@onceResolvedAsync`      |
| `OnResolvedModule`  | `OnResolvedAsyncModule`   |
| `resolved()`        | `resolvedAsync()`         |
| `HooksRunner.execute` | `HooksRunner.executeAsync` |

The two sides wrote to *different hook keys*, so the pairing was not a
convenience — it was a fork. A class could not mix a sync and an async hook on
one member, and enabling both kinds meant applying two modules. Worse, the split
was a trap: `@onConstruct` with an async hook did not run it asynchronously, it
threw `UnexpectedHookResultError` at execution time, long after the declaration
that caused it.

The postfix also duplicated everything downstream — two runners, two modules,
two pipes, two test files, two README sections — to express a distinction the
caller of a hook has no reason to care about. Whether a hook awaits something is
the hook's business.

## Decision

**One hook key, one decorator, one module per domain, taking sync and async
hooks alike.** The `Async` variants are removed, not aliased.

`HooksRunner.execute` absorbs both paths. It runs a member's hook chain eagerly
and stays synchronous until a hook returns a promise; from that point the rest of
that chain is awaited:

```typescript
execute(target, context): void | Promise<void>;
```

It returns `undefined` when nothing went async — every hook has already finished
by the time it returns — and a promise settling after the async hooks otherwise.
Each decorated member gets its own chain, started in declaration order; the
returned promise settles once all of them have.

That return type is what makes one path viable. A purely promise-based runner
would have deferred *sync* hooks to a microtask, so `@onConstruct` property
injection and initialization would no longer be finished when `resolve` returns
— a silent behavior change in the common case. Sync-until-async keeps existing
sync behavior exact while making async hooks work anywhere.

A shared `runHooks(runner, target, scope, onException?)` helper routes both
kinds of failure — what a sync hook threw and what an async hook rejected with —
to one `OnExceptionHandler`. Every module now takes one.

`UnexpectedHookResultError` is deleted along with the sync-only path: no hook
result is unexpected any more.

Separately, `@onContainerDisposed` becomes `@onScopeDisposed`, matching the
`IContainer.onScopeDisposed` event it is declared against — the naming ADR 0012
applied to the imperative side, now applied to the declaration too.

> [!NOTE]
> `HooksRunner`, its `void | Promise<void>` return and the `runHooks` /
> `OnExceptionHandler` plumbing were replaced by
> [ADR 0014](0014-hook-execution-strategy.md): hook execution is a
> `HookExecutionStrategy` chosen by the caller, `execute` returns `void`, and
> failures go to the strategy's `onError` handler. The decision this record
> makes — one hook key and one decorator per domain, taking sync and async
> hooks alike — stands.

## Consequences

**Positive**

- A hook's being sync or async is invisible to everything but the hook. Turning
  a hook async is a one-line change in the hook, with no decorator, module, or
  registration to swap.
- Sync and async hooks coexist on one class, one member, and one hook key.
- The declaration-time trap is gone: there is no longer a decorator that accepts
  an async hook and then fails when it runs.
- Roughly half the hook surface disappears — one runner method, four fewer
  decorators, three fewer modules, one fewer pipe, one fewer error.
- `onException` is uniform, so a module reports a rejected async hook and a
  thrown sync one the same way.
- `@onScopeDisposed` names the event it fires on.

**Negative / trade-offs**

- Breaking change with no shim: every `Async` import is removed, as is
  `UnexpectedHookResultError` and `@onContainerDisposed`. A major bump.
- `HooksRunner.execute` returns `void | Promise<void>`, so a caller that wants
  to wait must `await` a value that is often `undefined`. That is the honest
  type — the alternative is deferring sync hooks that need not be deferred.
- Two members whose chains both go async still run concurrently, so their
  interleaving is unordered. Only the settling of the returned promise is
  guaranteed.
- A hook that goes async in a member declared after one that threw synchronously
  can be left unobserved. This matches the previous sync runner's behavior.
- Async hooks still cannot block resolution or disposal, so instances needing
  readiness must publish it themselves (unchanged from ADR 0007).

## References

- `lib/hooks/HooksExecutionStrategy.ts` — `execute` (formerly `HooksRunner`, see ADR 0014)
- `lib/hooks/onConstruct.ts`, `lib/hooks/onResolved.ts`, `lib/hooks/onScopeDisposed.ts`
- `__tests__/specs/lifecycle-hooks.spec.ts`
- [ADR 0007 — Lifecycle hooks via reflect-metadata and opt-in modules](0007-lifecycle-hooks.md)
- [ADR 0012 — Hook registration lives with the domain which raises the event](0012-hook-domains.md)
- [ADR 0014 — Hook execution is a strategy, chosen by the caller](0014-hook-execution-strategy.md)
