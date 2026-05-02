# ADR 0004 — Pipe-based composition via ProviderPipe

- **Status:** Accepted
- **Date:** 2026-04-26
- **Deciders:** core maintainers
- **Tags:** provider, registration, composition

## Context

Provider behavior needs to be extended with small, independent capabilities:
singleton caching, argument binding, class-instance lazy resolution,
decoration, access control, and registration metadata. A
subclass-per-combination design would grow quickly and make ordering hard to
reason about.

We needed an extension mechanism that works from decorators, fluent
registrations, and direct provider composition.

## Decision

Represent provider features as pipe functions. A `ProviderPipe` can map both a
provider and a registration:

- `mapProvider` transforms an `IProvider`.
- `mapRegistration` applies the same transformation through
  `IRegistration.pipe`.

`registerPipe` builds common provider-only pipes and adapts them for
registration use. Registration-only behavior, such as `scope()` and
`bindTo()`, remains a plain `MapFn<IRegistration>`.

Provider features themselves are implemented as direct mutator methods on the
single `Provider` class — `singleton()`, `lazy()`, `map()`, `addArgsFn()`,
`addAccessRule()`. Pipes are thin factories that call these methods. The
provider package has no dependency on the registration package; pipes live in
the registration layer because they bridge providers and registrations.

`lazy()` is part of this pipe system, but it is designed only for class
instances. It returns a JavaScript `Proxy` around a deferred class instance and
creates the real instance on first property or method access. It must not be
used for primitive values, plain values, functions, or provider results that
are not class instances.

> [!IMPORTANT]
> Provider pipes are the supported extension point for resolution-time
> behavior such as singleton caching, arguments, access control, decoration, and
> class-instance lazy creation.

> [!WARNING]
> Pipe order is observable for wrappers such as `decorate()`. Keep custom pipes
> small and document whether they operate on providers, registrations, or both.

## Consequences

**Positive**

- Features are composable and can be applied in decorators or fluent
  registrations with the same API shape.
- A single `Provider` class owns caching, instance mappers, args pipeline, and
  access rules — no decorator hierarchy to traverse during `resolve()`.
- The model avoids a large inheritance hierarchy for feature combinations.
- Lazy class instance creation can be enabled from decorators, fluent
  registrations, or direct provider composition with the same API.
- The provider package has no dependency on the registration package; pipes
  bridge the two layers from the registration side.

**Negative / trade-offs**

- Pipe order is part of the API surface and must remain predictable.
- Implementers of custom pipes need to understand the provider/registration
  boundary.
- Registration-only pipes cannot be used directly on providers.
- The `lazy()` pipe has a narrower domain than the generic `IProvider`
  interface: it assumes the resolved value is a class instance suitable for
  proxying.
- `singleton()` mutates provider state; applying a different cache key on an
  already-configured singleton throws `CannonSingletonApplyError` to prevent
  silent overwrite.

## References

- `lib/provider/IProvider.ts`
- `lib/provider/Provider.ts`
- `lib/registration/IRegistration.ts`
- `lib/errors/CannonSingletonApplyError.ts`
- `docs/src/pages/pipes.mdx`
