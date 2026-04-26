# ADR 0005 — Token immutability: chained tokens are new instances

- **Status:** Accepted
- **Date:** 2026-04-26
- **Deciders:** core maintainers
- **Tags:** token, immutability, api

## Context

Injection tokens are often shared constants. A token may be imported in many
modules and then customized with arguments, argument factories, or lazy
resolution for one call site. If those modifiers mutated the shared token,
unrelated resolutions could unexpectedly inherit the customization.

## Decision

Make token modifier methods return new token instances.

For tokens that support modifiers, `args(...)`, `argsFn(...)`, and `lazy()`
preserve existing configuration and return a new token with the additional
behavior. The original token remains unchanged.

`ConstantToken` does not support those modifiers because it resolves to the
same literal value and has no container-backed provider to configure.

`lazy()` marks the token resolution as lazy, but lazy resolution itself is only
defined for class instances. Tokens that point at primitive values, plain
values, functions, or other non-class provider results should not be specialized
with `lazy()`.

> [!IMPORTANT]
> Token modifiers are immutable. `args(...)`, `argsFn(...)`, and `lazy()` return
> new token instances and never mutate the shared token constant.

> [!WARNING]
> `lazy()` on a token is meaningful only when that token eventually resolves a
> class instance.

## Consequences

**Positive**

- Shared token constants are safe to reuse across modules.
- Token chains are referentially transparent: each expression fully describes
  its own resolution behavior.
- Lazy class-instance configuration and argument configuration can be composed
  without hidden global state.

**Negative / trade-offs**

- Chaining creates small short-lived objects.
- Token implementations repeat a similar cloning pattern.
- `ConstantToken` must reject modifier methods rather than silently accepting
  meaningless configuration.

## References

- `lib/token/InjectionToken.ts`
- `lib/token/SingleToken.ts`
- `lib/token/ClassToken.ts`
- `lib/token/FunctionToken.ts`
- `lib/token/SingleAliasToken.ts`
- `lib/token/GroupAliasToken.ts`
- `lib/token/ConstantToken.ts`
