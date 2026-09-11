# ADR 0014 — Hook execution is a strategy, chosen by the caller

- **Status:** Accepted
- **Date:** 2026-09-12
- **Deciders:** core maintainers
- **Tags:** hooks, lifecycle, api-design

## Context

[ADR 0013](0013-one-async-capable-hook-path.md) collapsed the sync and async
hook paths into one `HooksRunner`, and fixed *how* that runner behaved: run each
member's chain eagerly, stay synchronous until a hook returns a promise, await
the rest of that chain, and start every member's chain without waiting for the
previous one. That was the right default and the wrong place to hard-code it.

The runner answered three questions on behalf of every caller:

1. **In what order** do members run — one after another, or all at once?
2. **What is awaited** — nothing, each hook, each member?
3. **Where does a failure go** — thrown out of `resolve`, rejected into the
   void, or handed to a handler?

Different hook domains want different answers. `@onConstruct(injectProp(...))`
wants a synchronous run and nothing else. A set of `@onScopeDisposed` cleanups
can run concurrently. An initialization sequence where one member depends on
what an earlier one set up must run members one after another, awaiting each.
ADR 0013 itself listed the unordered interleaving of concurrent async members as
an accepted trade-off — accepted because there was no way to choose otherwise.

The runner also had two owners' worth of state: the key it read hooks under, and
the exception handler, which lived on the *module* and was threaded through a
shared `runHooks` helper. So the module knew how to report a failure but not how
to run a hook, and the runner knew how to run a hook but not what to do when
one failed.

## Decision

Hook execution becomes a **strategy object** — an abstract
`HookExecutionStrategy` with one concrete class per answer to the ordering
question — and every module takes one:

| Strategy                               | Members            | Hooks of one member                         | Awaits |
| -------------------------------------- | ------------------ | ------------------------------------------- | ------ |
| `SequentialSyncHookExecutionStrategy`  | one after another  | in declaration order                        | no     |
| `SequentialAsyncHookExecutionStrategy` | one after another  | in order, or all at once (`methodStrategy`) | yes    |
| `ParallelAsyncHookExecutionStrategy`   | all at once        | in order, or all at once (`methodStrategy`) | yes    |

```typescript
const container = new Container()
  .useModule(new OnConstructModule(new SequentialSyncHookExecutionStrategy({ key: 'onConstruct' })))
  .useModule(new OnDisposeModule(new ParallelAsyncHookExecutionStrategy({ key: 'onScopeDisposed' })));
```

### The strategy owns the whole "how"

A strategy is constructed with everything that shapes a run and nothing that
identifies one:

- the **key** it reads hook metadata under (`onConstruct`, `onScopeDisposed`,
  `onResolved`, or any custom key);
- an optional **`onError: (scope) => (error) => void`**, which receives what a
  sync hook threw and what an async hook rejected with alike;
- defaults for **`predicate`**, **`createExecutionContext`** and
  **`mapExecutionContext`**, each overridable per `execute` call.

The *target* and the *scope* are per-call: `strategy.execute(instance, { scope })`.
A module is therefore reduced to wiring a domain event to a strategy — it no
longer knows the key, and it no longer knows how to report a failure. The same
strategy class serves a built-in module and a custom hook key alike.

### `execute` returns nothing

`execute(): void`. The strategy starts its hooks and returns; whether and how
the async ones are awaited is internal to the strategy, and their outcome is
observable only through `onError`. A caller that needs to know when async hooks
have settled reads the state they publish, as ADR 0007 already required of
instances that expose readiness.

This replaces ADR 0013's `void | Promise<void>` return, which leaked the
sync-until-async mechanism into the type. Resolution and disposal remain
synchronous under every strategy: the sync strategy finishes before returning,
and both async strategies start their first hook synchronously and defer the
rest.

### Failures go to `onError`, or nowhere

A strategy without an `onError` handler drops a failure. Throwing out of
`resolve` because a hook failed was never a good default — it made a lifecycle
side effect fatal to the resolution that triggered it — and an unhandled
rejection was never a deliberate signal. Callers who want to see failures say
so by supplying a handler; the handler is the *strategy's*, so one handler
covers every module the strategy is passed to.

### `OnConstructModule` is a container module again

ADR 0012 made `OnConstructModule` an `IInjectorModule` so that a container would
not have to expose its injector. With every module taking a strategy, the
asymmetry of applying one module to the injector and the others to the
container was no longer worth that principle. `IContainer` gains
`getInjector()`, and `OnConstructModule` reaches the injector through it:

```typescript
new Container().useModule(new OnConstructModule(strategy));
```

The injector is still shared by the whole scope tree, so `onConstructed` hooks
registered through `getInjector()` remain tree-wide.

### `@onResolved` loses its shorthand

`@onResolved()` with no hook used to mean "invoke the decorated method"; that
default and the exported `invokeMethod` hook it stood for are removed. Every
resolve decorator now takes its hooks explicitly, like `@onConstruct` and
`@onScopeDisposed` always have. Callers who want the old behavior write the
one-line hook themselves.

## Consequences

**Positive**

- Ordering, awaiting and error reporting are chosen per module, by the caller,
  from named classes — not fixed by the library.
- Members can be run one after another and awaited, closing the "unordered
  interleaving" trade-off of ADR 0013.
- A strategy is reusable: one instance serves a module and any number of manual
  `execute` calls for the same key.
- Modules shrink to a single responsibility — wiring an event to a strategy.
- `hasHooks`, `predicate` and context creation move next to the key they
  belong to, so custom hook keys need no more plumbing than built-in ones.

**Negative / trade-offs**

- Breaking change: `HooksRunner`, `runHooks`, `OnExceptionHandler` as a module
  parameter, `invokeMethod`, the `@onResolved()` shorthand and the
  `IInjectorModule` form of `OnConstructModule` are gone without a shim.
- Every module now needs a strategy, and the strategy needs the key — a
  container with construct, dispose and resolve hooks constructs three
  strategies where it used to construct three modules.
- `execute` returning `void` means a caller cannot `await` a strategy; tests
  and readiness checks wait on published state instead.
- A hook failure is silent unless an `onError` handler is set. The sync
  strategy in particular starts a promise-returning hook and never observes it.
- The async strategies stay synchronous only up to the first `await`, so a
  member's second hook, or a second member under the sequential strategy, runs
  after `resolve` has returned. Hooks that must complete before resolution
  returns belong under the sync strategy.
- ADR 0012's "no `getInjector()`" principle is reversed; the accessor exists
  and code holding an `IContainer` can now register construct hooks.

## References

- `lib/hooks/HooksExecutionStrategy.ts` — `HookExecutionStrategy`, `execute`, `onError`
- `lib/hooks/SequentialSyncHookExecutionStrategy.ts`
- `lib/hooks/SequentialAsyncHookExecutionStrategy.ts`
- `lib/hooks/ParallelAsyncHookExecutionStrategy.ts`
- `lib/hooks/onConstruct.ts`, `lib/hooks/onResolved.ts`, `lib/hooks/onScopeDisposed.ts`
- `lib/container/IContainer.ts` — `getInjector`
- `__tests__/specs/lifecycle-hooks.spec.ts`
- [ADR 0007 — Lifecycle hooks via reflect-metadata and opt-in modules](0007-lifecycle-hooks.md)
- [ADR 0012 — Hook registration lives with the domain which raises the event](0012-hook-domains.md)
- [ADR 0013 — One async-capable hook path, no `Async` variants](0013-one-async-capable-hook-path.md)
