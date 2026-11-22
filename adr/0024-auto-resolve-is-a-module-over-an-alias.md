# ADR 0024 — Auto-resolve is a module over an alias, not a core flag

- **Status:** Accepted
- **Date:** 2026-11-22
- **Deciders:** core maintainers
- **Tags:** modules, aliases, api-design

## Context

Eager resolution — creating services nobody injects (schedulers, subscribers,
warm caches) as soon as their scope exists — shipped (#136) as state spread over
the core:

- an `autoResolve()` registration pipe setting a flag on the provider,
- `IProvider.autoResolve()` / `IProvider.isAutoResolvable()` and a field on
  `Provider` to hold it,
- `IContainer.autoResolve(options)` on `Container` (and a throwing stub on
  `EmptyContainer`) to walk the provider map and resolve the flagged entries,
- `AutoResolveModule`, which only subscribed `scope.autoResolve(...)` to
  `scopeCreated`.

Only the last piece is a module. The rest is one feature's policy written into
the two classes every other feature goes through. The library's direction
(ADR 0016 – 0018) is the opposite: the core exposes mechanisms — aliases, the
`scopeCreated` / `scopeDisposed` / `registered` events, provider hooks — and a
feature is an `IContainerModule` (or a hook) built on them, aspect-style, so the
core does not grow with every feature.

Everything eager resolution needs is already a core mechanism. Marking a set of
registrations is what an alias is for, and "resolve every member of a set" is
`resolveByAlias`. The one missing piece was keeping the lookup in the created
scope: `resolveByAlias` walks the parent chain, so a provider registered only in
a parent would be resolved again — a new instance, unless it is a singleton —
for every descendant scope.

## Decision

**Auto-resolve is `AutoResolveModule` plus an alias, and nothing in the core.**

- `AutoResolveToken` — a `GroupAliasToken` exported next to the module — is
  the marker: `@register(AutoResolveToken, singleton())`. No pipe: binding to a
  token is how a registration gains an alias already.
- `AutoResolveModule` subscribes to `scopeCreated` and resolves
  `AutoResolveToken` on the created scope with the module's `args`.
- `resolveByAlias` gets a `shallow` option (`ResolveManyOptions`), passed through
  by `GroupAliasToken.resolve`: `shallow: true` stops at the scope it starts
  from. The module resolves shallowly, so only the created scope's own
  providers are eagerly created — the behaviour the flag-based version had.
  `shallow` is a general alias-lookup option, not an auto-resolve one.
- Removed: the `autoResolve()` pipe, `IProvider.autoResolve()` /
  `isAutoResolvable()` and the `Provider` field behind them,
  `IContainer.autoResolve()` and its `Container` / `EmptyContainer`
  implementations. `AutoResolveOptions` moves from `IContainer` to the module.
- Resolving the root container's own eager providers, or a scope's with
  per-scope `args`, is the same call the module makes:
  `AutoResolveToken.resolve(scope, { args, shallow: true })`.

## Consequences

- Breaking change (major). Migration:
  `@register(autoResolve())` → `@register(AutoResolveToken)`;
  `container.autoResolve(options)` →
  `AutoResolveToken.resolve(container, { ...options, shallow: true })`
  (`shallow` is redundant on a root container, whose parent is empty).
- `Provider` and `Container` no longer know about auto-resolve; the feature is
  removable by not applying the module.
- Eager dependencies are discoverable as a group:
  `AutoResolveToken.resolve(scope)` returns them, and `container.hasAlias(...)`
  answers whether a scope tree has any.
- Order of eager resolution is alias-registration order, as for any alias group.
- An application can define its own eager group the same way — any
  `GroupAliasToken` resolved shallowly on `scopeCreated` — without a library
  change.
