# ADR 0009 — Token taxonomy: Single / Group / Alias / Class / Function / Constant

- **Status:** Accepted
- **Date:** 2026-04-26
- **Deciders:** core maintainers
- **Tags:** token, resolution, aliases

## Context

The container supports several resolution shapes:

- one dependency by key,
- one dependency by alias,
- many dependencies by alias,
- a class constructor,
- a custom resolver function,
- a literal constant value.

Trying to represent all of these as plain strings, symbols, or constructors
would make APIs less type-safe and would push resolution details into callers.

## Decision

Use a small taxonomy of `InjectionToken` implementations:

- `SingleToken` resolves a single dependency key.
- `SingleAliasToken` resolves the first dependency bound to an alias.
- `GroupAliasToken` resolves all dependencies bound to an alias.
- `ClassToken` resolves a class constructor through the container injector.
- `FunctionToken` runs a custom resolution function.
- `ConstantToken` returns a literal value.

Alias tokens also implement `BindToken`, allowing registrations to bind to
aliases through the same fluent API.

> [!IMPORTANT]
> Token classes intentionally model different resolution shapes. This keeps
> call sites explicit about whether they expect one value, many alias values, a
> class instance, a computed value, or a constant.

> [!WARNING]
> Lazy token configuration is meaningful only for tokens that resolve class
> instances. Alias and key tokens can point at non-class providers, so users
> must choose `lazy()` only when the bound provider creates a class instance.

## Consequences

**Positive**

- Call sites can express the expected resolution shape directly.
- Alias-based plugin and multi-provider scenarios are first-class.
- Tokens can carry arguments and class-instance lazy configuration without
  changing container method signatures.

**Negative / trade-offs**

- The token surface is larger than a single generic token class.
- Some token types intentionally support fewer operations, such as
  `ConstantToken`.
- Lazy token configuration is meaningful only when the token resolves to a
  class instance. It should not be used for primitives, plain values, functions,
  or non-class provider results.
- Alias resolution order follows container and parent-chain behavior, so users
  need to understand scoping when aliases are spread across scopes.

## References

- `lib/token/InjectionToken.ts`
- `lib/token/SingleToken.ts`
- `lib/token/SingleAliasToken.ts`
- `lib/token/GroupAliasToken.ts`
- `lib/token/ClassToken.ts`
- `lib/token/FunctionToken.ts`
- `lib/token/ConstantToken.ts`
- `lib/token/BindToken.ts`
- `lib/select.ts`
