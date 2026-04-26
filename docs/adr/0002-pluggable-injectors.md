# ADR 0002 — Pluggable injector strategies (Metadata / Simple / Proxy)

- **Status:** Accepted
- **Date:** 2026-04-26
- **Deciders:** core maintainers
- **Tags:** injector, metadata, proxy

## Context

Consumers use the container in different TypeScript environments. Some projects
can rely on decorator metadata, while others avoid decorators or need a smaller
runtime surface. A single constructor-injection mechanism would force all users
into one style.

The main options were:

1. Always use `reflect-metadata` and constructor parameter metadata.
2. Require every class to accept the container directly.
3. Use a proxy object that resolves dependencies by property access.
4. Keep construction behind a strategy interface and let each container choose.

## Decision

Use an `IInjector` abstraction with a shared `Injector` base class. `Container`
delegates class construction to its configured injector and defaults to
`MetadataInjector`.

The supported strategies are:

- `MetadataInjector`, which resolves constructor arguments from metadata via
  `resolveArgs`.
- `SimpleInjector`, which passes the container as the first constructor
  argument.
- `ProxyInjector`, which passes a proxy whose properties resolve dependencies
  on demand, with names containing `alias` resolved through `resolveByAlias`.

The base `Injector` owns class-instance lazy wrapping and instance tracking,
so all strategies share construction lifecycle behavior.

> [!IMPORTANT]
> Lazy construction belongs to class instances created through injectors. It is
> not a general-purpose wrapper for arbitrary provider values.

> [!WARNING]
> `ProxyInjector` resolves dependencies from property names. Renaming,
> minification, or unclear alias naming can change resolution behavior.

## Consequences

**Positive**

- Users can choose decorator-based, explicit-container, or proxy-style
  injection without changing container resolution.
- Instance tracking and lifecycle hooks remain consistent across strategies.
- Lazy construction remains tied to class instances produced by injectors,
  rather than to arbitrary provider values.
- New injection styles can be added without rewriting `Container`.

**Negative / trade-offs**

- The public API exposes multiple ways to inject dependencies, so documentation
  must explain when each strategy fits.
- `ProxyInjector` relies on property names and the `alias` naming convention,
  which is convenient but less explicit than tokens or metadata.
- `MetadataInjector` still requires projects using metadata injection to load
  and configure `reflect-metadata`.

## References

- `lib/injector/IInjector.ts`
- `lib/injector/MetadataInjector.ts`
- `lib/injector/SimpleInjector.ts`
- `lib/injector/ProxyInjector.ts`
- `lib/container/Container.ts`
