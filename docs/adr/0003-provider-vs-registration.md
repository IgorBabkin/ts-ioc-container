# ADR 0003 — Separate Provider and Registration abstractions

- **Status:** Accepted
- **Date:** 2026-04-26
- **Deciders:** core maintainers
- **Tags:** provider, registration, api

## Context

Dependency configuration has two distinct responsibilities:

1. Deciding **where and under which keys** a dependency is available.
2. Deciding **how** that dependency is resolved once selected.

Combining both into one object would make each feature know too much about
scope matching, aliases, provider decoration, constructor arguments,
class-instance lazy resolution, and singleton caching.

## Decision

Keep `IRegistration` and `IProvider` as separate abstractions.

`Registration` is responsible for configuration-time concerns:

- binding a dependency to a key,
- binding aliases,
- applying scope match rules,
- creating a provider,
- applying provider mappers before registering with a container.

`Provider` is responsible for resolution-time concerns:

- resolving a value from a container,
- calculating argument lists,
- applying lazy resolution for class instances,
- enforcing access rules,
- supporting provider-level pipes.

The container stores concrete providers by dependency key after registrations
have been applied.

> [!IMPORTANT]
> Registration placement and provider resolution are separate concepts:
> `scope()` decides where a provider is registered, while provider pipes decide
> how a registered provider behaves.

> [!WARNING]
> `lazy` is only valid for class instance results. Primitive values, plain
> values, functions, and other non-class provider results should resolve
> eagerly.

## Consequences

**Positive**

- Scope matching runs when a registration is applied to a container, not during
  every successful provider resolution.
- Provider features such as `singleton`, `lazy`, `appendArgsFn`, and
  `scopeAccess` compose without requiring registration-specific logic.
  `lazy` is intentionally limited to class instance results; primitive values,
  plain values, functions, and other non-class provider results should resolve
  eagerly.
- Decorator metadata and fluent registration share the same registration path.

**Negative / trade-offs**

- The API has two concepts to learn instead of one.
- Some pipes need to declare whether they operate on providers, registrations,
  or both.
- Debugging availability requires checking both registration rules and provider
  access rules.

## References

- `lib/provider/IProvider.ts`
- `lib/provider/Provider.ts`
- `lib/registration/IRegistration.ts`
- `lib/registration/Registration.ts`
- `docs/src/pages/provider.mdx`
- `docs/src/pages/registration.mdx`
