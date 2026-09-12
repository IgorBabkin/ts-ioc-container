# ADR 0017 — No predefined hook keys or decorators

- **Status:** Accepted, completes
  [ADR 0016](0016-collect-hooks-let-the-caller-run-them.md); the modules it kept
  were then removed by [ADR 0018](0018-no-hook-modules.md)
- **Date:** 2026-09-12
- **Deciders:** core maintainers
- **Tags:** hooks, lifecycle, api-design

## Context

[ADR 0016](0016-collect-hooks-let-the-caller-run-them.md) left the library
collecting hooks and the caller running them, but three hook *keys* were still
the library's: `onConstruct`, `onScopeDisposed` and `onResolved`, each with a
decorator (`@onConstruct(fn)`) that was nothing but `hook('onConstruct', fn)`,
and each baked in as a module's default collector.

Those keys bought nothing the library could act on:

- **A decorator is one line of user code.** `export const onConstruct = (fn: HookType) => hook('onConstruct', fn)`
  is the whole implementation. Shipping it made a naming choice on the user's
  behalf and put the library in the way of theirs.
- **The key looked meaningful and was not.** Nothing in the container reacts to
  `onConstruct`; a module only collects whatever key its collector carries. The
  name suggested a privileged path that did not exist — `@hook('onConstruct', …)`
  and `@onConstruct(…)` produced identical metadata.
- **A default key hid a wiring mistake.** `new OnConstructModule(runner)` ran
  hooks under `onConstruct` whether or not that was the key the application's
  decorators wrote, so a typo in a custom key surfaced as hooks silently never
  running.
- **Two tiers of hook, for no reason.** The README documented `@onConstruct`
  first and "custom hooks" as an advanced section, though the built-ins were the
  same mechanism with a name chosen earlier.

## Decision

**The library ships no hook keys and no hook decorators.** `hook(key, fn)` is
the only decorator, and every key is the application's.

```typescript
// yours, in one line each
const onConstruct = (fn: HookType) => hook('onConstruct', fn);
const onConstructHooks = new HookCollector({ key: 'onConstruct' });

container.useModule(new OnConstructModule(runner, onConstructHooks));
```

- `onConstruct`, `onScopeDisposed` and `onResolved` are removed from the
  library's exports.
- `OnConstructModule`, `OnDisposeModule`, `OnResolvedModule` and the
  `resolved(...)` pipe now **require** a collector: with no key of its own, a
  module cannot default one. (They were removed outright by
  [ADR 0018](0018-no-hook-modules.md), which found that a module holding only a
  `subscribe` was not worth shipping either.)
- `injectProp` stays: it is a hook *function*, not a key.

### `getHooks` is a plain function again

ADR 0016 memoized `getHooks` itself, for every caller. That is reverted:
`getHooks` merges the prototype chain on each call and returns a fresh map, as
it did before. The cache lives where the repeated reads are — `HookCollector`
holds a `memoize(getHooks)` — so collecting on a hot event still reads a class's
metadata once per key, while a caller reading hooks directly gets a plain
function and can wrap it in the same exported `memoize` if they want. Hook
metadata is fixed once a class is defined, so memoizing it is always safe.

## Consequences

**Positive**

- One mechanism, one tier: every hook in every application is a custom hook, and
  the documentation has one story to tell instead of two.
- A module can no longer collect a key nobody writes: the collector is named at
  the call site, next to the decorator that shares its key.
- Applications name lifecycle events in their own vocabulary (`onBoot`,
  `onRequestFinished`) without those names looking second-class beside
  library-blessed ones.
- The library's hook surface shrinks to `hook`, `HookCollector`, `HookAction`,
  `HookRunner`, `toTask`, the combinators and the three event modules.

**Negative / trade-offs**

- Breaking change with no shim: `onConstruct`, `onScopeDisposed` and
  `onResolved` are gone, and the modules take a required second argument.
  Restoring the old behavior is four lines of application code — a decorator
  and a collector per key — but it is four lines every consumer now writes.
- The first-run experience is longer: the smallest working construct hook needs
  a decorator, a collector, a runner and a module.
- Nothing stops two parts of an application from choosing the same key string
  for different intents; the library no longer owns any name to arbitrate with.

## References

- `lib/hooks/hook.ts` — `hook`, `getHooks` (uncached again), `HookType`
- `lib/hooks/HookCollector.ts` — `HookCollector`, `HookAction`, `HookRunner`, `toTask`
- `lib/hooks/OnConstructModule.ts`, `lib/hooks/OnDisposeModule.ts`, `lib/hooks/OnResolvedModule.ts`
- `lib/utils/memoize.ts` — `memoize`, for a caller which wants collection cached
- `__tests__/hooks/decorators.ts` — the decorators and collectors a consumer writes
- [ADR 0012 — Hook registration lives with the domain which raises the event](0012-hook-domains.md)
- [ADR 0016 — The library collects hooks; the caller runs them](0016-collect-hooks-let-the-caller-run-them.md)
