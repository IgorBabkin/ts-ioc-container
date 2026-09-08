# ADR 0012 — Resolution is the only construction-time hook point

- **Status:** Accepted
- **Date:** 2026-09-08
- **Deciders:** core maintainers
- **Tags:** hooks, lifecycle, providers
- **Amends:** [ADR 0007 — Lifecycle hooks via reflect-metadata and opt-in modules](0007-lifecycle-hooks.md)

## Context

ADR 0007 gave the container two construction-time hook points, reached through
two different container-level hooks:

- `@onConstruct` / `@onConstructAsync`, run from `Container.addInstance` via the
  `onConstruct` container hook — that is, from the injector, once per instance
  the container itself built.
- `@onResolved` / `@onResolvedAsync`, run from `IProvider.onResolve` via the
  `onProviderRegistered` container hook — once per dependency handed out.

The construct pair only ever saw a *pure instance*: an object the injector had
just built. Everything else the container hands out was invisible to it — a
`R.fromValue` constant, a `R.fromFn` factory result, an instance shared across
keys or scopes, the repeat resolves of a singleton. Two hook points meant two
modules to register, two hook keys to learn, and a rule about which one covers
which dependency.

The one thing `@onConstruct` covered that `@onResolved` did not was
`container.resolve(SomeClass)` — resolving a bare constructor. That path went
straight to the injector, with no provider in between, so there was no
`onResolve` list to hook.

## Decision

Keep resolution as the container's only construction-time hook point. Remove
`@onConstruct`, `@onConstructAsync`, `OnConstructModule`,
`OnConstructAsyncModule`, the `onConstruct` container hook and the `InstanceHook`
type. `Container.addInstance` now only tracks the instance.

To close the gap that justified them, **the container makes up a
`TransientProvider` for a class resolved by its constructor**. On the first
`resolve(SomeClass)` in a scope, the container creates one over
`construct(SomeClass)`, keeps it per class for that scope, and announces it to
`onProviderRegistered` like any registered provider. Provider-level behavior —
`onResolved` hooks above all — therefore reaches classes which were never
registered.

`TransientProvider` is named as its own type rather than left an anonymous
`Provider`, because it is a distinct kind of thing and worth being able to talk
about and recognize. What it hands out is the pure injector value, or a lazy
proxy of it when the resolve asked for one. Nothing else: no decorators, no
cache, no access rules, no args functions, because there is no registration to
declare any. Hence *transient* — a new instance leaves it on every resolve, and
nothing can configure it otherwise; a class that needs a singleton or pipes
needs a registration, and is then resolved by its key. Being its own type also
lets a hook tell a made-up provider from a declared one
(`provider instanceof TransientProvider`).

These providers are keyed by the constructor in a map of their own, not by
`Target.name` in the keyed provider map: a class is not a `DependencyKey`, two
classes can share a name (and minifiers make that likely), and a name would
collide with a registration bound to the same string. They are disposed with the
scope that made them.

`IContainer` gains `construct(Target, options)`: the raw injector step that
`resolve` used to end in, now public. `Provider.fromClass` builds through it
instead of calling back into `container.resolve`, which is what keeps a
registered class from being hooked twice — once by its own provider and once by
a made-up one.

`OnResolvedModule` and the `resolved()` pipe take the optional `onException`
handler `OnConstructModule` had, so the sync exception-handling path survives the
removal. `OnExceptionHandler` moves to `lib/ExecutionContext.ts`, next to the
context it receives.

`onceForEachInstance` becomes public. It is the migration path: an initializer
that must run once per instance is `@onceResolved()`, which is
`@onResolved(onceForEachInstance(invokeMethod))` spelled out.

> [!IMPORTANT]
> This is a breaking change. `@onConstruct` becomes `@onceResolved`,
> `@onConstructAsync` becomes `@onceResolvedAsync`, and the modules change to
> `OnResolvedModule` / `OnResolvedAsyncModule`. A container-level
> `onConstruct(fn)` hook becomes `onProviderRegistered((p) => p.onResolve(fn))`.

> [!NOTE]
> `@onResolved` fires on *every* resolve, where `@onConstruct` fired once per
> constructed instance. `@onceResolved` is the like-for-like replacement; plain
> `@onResolved` is not.

`ProviderHook` loses its `key` argument, becoming
`(provider: IProvider, scope: IContainer) => void`. A made-up provider has no
`DependencyKey` to report, and nothing in the library used the key.

## Consequences

**Positive**

- One hook point, one mental model: hooks observe what the container hands out.
- Hooks now cover dependencies construction never reached — constants, factory
  results, objects shared across keys and scopes, repeat resolves of a
  singleton — and still cover unregistered classes.
- One module to register instead of two, and `resolved()` / `resolvedAsync()`
  give per-registration opt-in, which the construct modules never had.
- `construct` names the injector step explicitly, so a provider can build a
  class without recursing through `resolve`.

**Negative / trade-offs**

- Breaking change for every consumer using `@onConstruct`.
- `@onResolved` runs per resolve, so a naive migration from `@onConstruct`
  changes how often an initializer runs; `onceForEachInstance` has to be opted
  into.
- Resolving a bare constructor now allocates a `TransientProvider` per class per
  scope, where it previously allocated nothing.
- A `TransientProvider` is transient by construction, so a
  `@register(singleton())` on the class does not apply to `resolve(SomeClass)` —
  only to the registered key. That was already true, and stays true.

## References

- `lib/provider/TransientProvider.ts`
- `lib/container/Container.ts` — `getTransientProvider`, `construct`
- `lib/container/IContainer.ts` — `ProviderHook`, `construct`
- `lib/hooks/onResolved.ts`
- `lib/hooks/onResolvedAsync.ts`
- `lib/hooks/resolveHooks.ts` — `onceForEachInstance`
- `__tests__/container/OnProviderRegistered.spec.ts`
- `__tests__/specs/lifecycle-hooks.spec.ts`
