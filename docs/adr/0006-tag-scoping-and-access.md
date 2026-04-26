# ADR 0006 — Tag-based scoping with separate match and access rules

- **Status:** Accepted
- **Date:** 2026-04-26
- **Deciders:** core maintainers
- **Tags:** container, scoping, access

## Context

The container supports nested scopes such as application, request, transaction,
page, and widget. Dependencies may need two different kinds of scope behavior:

1. They may be **registered only into matching scopes**.
2. They may be **visible only to certain invocation scopes**.

Using one rule for both concerns would make cross-scope dependency injection
ambiguous, especially when a parent-scoped service needs access control based
on the child scope that initiated resolution.

## Decision

Use tags as the common vocabulary for scope behavior, but keep match rules and
access rules separate.

- `scope(...rules)` adds registration match rules. These decide whether a
  registration applies to a container when it is registered or when a child
  scope is created.
- `scopeAccess(rule)` adds a provider access rule. This is evaluated during
  resolution with both `invocationScope` and `providerScope`.

Resolution passes the original child scope up the parent chain so access rules
can make decisions based on where the dependency was requested, not only where
the provider is stored.

> [!IMPORTANT]
> `scope()` and `scopeAccess()` solve different problems. `scope()` controls
> registration placement; `scopeAccess()` controls runtime visibility from the
> invocation scope.

> [!WARNING]
> Scope match rules run when registrations are applied. Adding tags later does
> not retroactively register providers into an existing container.

## Consequences

**Positive**

- Registration placement and runtime visibility are explicit, separate
  concepts.
- Tags avoid hardcoded scope classes or fixed lifetime names.
- Providers in parent scopes can safely expose or hide themselves based on the
  requesting scope.

**Negative / trade-offs**

- Users must choose between `scope()` and `scopeAccess()` correctly.
- Scope behavior can be harder to inspect because registration match happens at
  apply time while access checks happen at resolve time.
- Tag names are string-based conventions, so applications should keep them
  consistent.

## References

- `lib/container/IContainer.ts`
- `lib/container/Container.ts`
- `lib/registration/IRegistration.ts`
- `lib/provider/IProvider.ts`
- `docs/src/assets/diagrams/cross-scope-dependency-injection.mermaid`
- `docs/src/pages/container.mdx`
- `docs/src/pages/pipes.mdx`
