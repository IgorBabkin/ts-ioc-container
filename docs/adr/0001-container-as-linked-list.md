# ADR 0001 — Container as a linked list of scopes

- **Status:** Accepted
- **Date:** 2026-04-26
- **Deciders:** core maintainers
- **Tags:** container, scoping, resolution

## Context

A DI container needs to model lifetimes that match the host application: an
"application" scope that lives for the whole process, a "request" / "page"
scope that lives for one unit of work, and possibly nested scopes within
those (e.g. "transaction", "widget").

Common alternatives in the JS/TS ecosystem are:

1. A flat container with named lifetimes (`singleton`, `transient`, `scoped`)
   where `scoped` is a single second-tier bucket.
2. A tree of containers where each node holds its own provider map and asks
   the parent only when a key is missing.
3. A single registry plus per-resolution context objects.

We need arbitrarily nested lifetimes (application → request → transaction),
isolation between sibling scopes, and predictable cleanup when a scope ends.

## Decision

Model the container as a **node in a singly-linked parent chain**. Every
`Container` instance holds:

- a `parent: IContainer` reference (defaulting to `EmptyContainer` at the root),
- its own `providers`, `aliases`, `instances`, and `registrations`,
- a `scopes: IContainer[]` list of children for inspection and instance
  traversal.

`createScope({ tags })` constructs a new `Container` with `parent: this`,
re-applies the inherited registrations that match the new scope, and links it
into `scopes`. Scope creation is **snapshot-like**: registrations that already
exist in the parent chain are applied to the child at creation time, while
registrations added to a parent later are not pushed into existing children.
Resolution walks the chain: if the current node does not have the key (or the
provider's access rule denies it), it delegates to `this.parent.resolve(...)`.

Disposal is intentionally **local** to the container being disposed. A disposed
container runs its own dispose hooks, clears its own providers, aliases,
registrations, and instances, and detaches from its parent. It does not
automatically dispose child scopes. This lets host frameworks such as React own
child lifecycles explicitly: a page, component, widget, or request scope should
be disposed by the code that owns that lifecycle.

> [!IMPORTANT]
> Scope creation is a snapshot of matching registrations at the moment
> `createScope()` is called. Local disposal is also intentional: each scope is
> owned and disposed by the lifecycle that created it.

> [!WARNING]
> Existing child scopes do not receive registrations added to a parent later,
> and disposing a parent does not dispose children. Create/dispose child scopes
> explicitly when their lifecycle requires it.

`EmptyContainer` is the **terminator**. Its `resolve` throws
`DependencyNotFoundError`; its `getRegistrations` / `getScopes` return empty
arrays; mutating methods throw `MethodNotImplementedError`. This null-object
pattern removes `parent === undefined` checks from `Container`.

## Consequences

**Positive**

- Arbitrary nesting depth without changing the model.
- Resolution semantics are explicit and recursive — easy to reason about.
- Sibling scopes are fully isolated; disposing one does not affect another.
- Parent and child lifecycles can be controlled independently, which fits UI
  frameworks and other hosts where child lifetimes are not strictly bounded by
  parent disposal.
- Snapshot scope creation makes registration availability predictable for a
  given scope once that scope has been created.
- `EmptyContainer` makes `Container.resolve` branch-free at the root.

**Negative / trade-offs**

- Resolution cost grows linearly with chain depth. In practice the chains are
  short (≤ 3–4 levels) so this is acceptable.
- Outer scopes cannot see inner-scope registrations — this is a
  **deliberate** asymmetry but trips users who expect symmetric visibility.
  Documented in `CLAUDE.md` under "Cross-Scope Injection Limitation"; the
  mitigation is `scopeAccess` (see ADR 0006) instead of `scope` match rules.
- Existing child scopes do not receive registrations added to a parent later.
  Applications that need the new registration in a child must create a new
  scope or add the registration to that child explicitly.
- `createScope` reapplies registrations into the child. If a parent registers
  many keys, scope creation is O(n) in the registration count.
- Disposing a parent does not clean up child scopes. This is deliberate, but
  users must dispose each owned child scope when that child's lifecycle ends.

## References

- `lib/container/Container.ts`
- `lib/container/EmptyContainer.ts`
- `CLAUDE.md` → "Container as Linked List"
