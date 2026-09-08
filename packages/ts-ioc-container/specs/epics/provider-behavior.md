# Epic: Provider behavior

- **Status:** Accepted
- **ADR:** [ADR 0004 - Pipe-based composition via ProviderPipe](../../docs/adr/0004-provider-pipe-composition.md), [ADR 0011 - Specs-driven development workflow](../../docs/adr/0011-spec-driven-development.md)
- **Public API:** `Provider`, `TransientProvider`, `IProvider`, `singleton`, `multiCache`, `appendArgs`, `appendArgsFn`, `lazy`, `autoResolve`, `scopeAccess`, `decorate`, `onResolve`, `ProviderPipe`
- **Executable spec:** `__tests__/specs/provider-behavior.spec.ts`

## Intent

As an application architect, I want provider behavior to be composable so that
dependency creation can be cached, parameterized, delayed, decorated, or
restricted without creating a custom registration type for every combination.

## Stories

### Story: Resolve provider values from different sources

As a library user, I can create providers from classes, values, factories, and
keys so that the container can resolve dependencies from the shape that fits
the application.

Acceptance criteria:

- A class provider delegates class construction to the container.
- A value provider returns the configured value.
- A factory provider receives the container and provider options.
- A key provider resolves another key from the same container context.

### Story: Cache provider results

As an application developer, I can mark a provider as singleton so that
expensive or stateful dependencies are reused within the provider's scope.

Acceptance criteria:

- A singleton provider returns the same value for repeated resolution with the
  same cache key.
- A multi-cache singleton can cache different values for different argument
  keys.
- Singleton caching is local to the provider instance registered in a scope.

### Story: Parameterize provider resolution

As a library user, I can pass static or dynamic arguments to a provider so that
generic services can be specialized for a call site.

Acceptance criteria:

- `appendArgs` supplies fixed arguments after any incoming resolve arguments.
- `appendArgsFn` computes additional arguments from the resolving container and
  incoming options, then appends them after the provider's existing argument
  function.
- Arguments forwarded into a class constructor are resolved when they are
  `InjectionToken` instances and passed through as literals otherwise.

> **!Important** — Bare constructors are **not** auto-resolved when passed as
> arguments. Consumers must wrap them in a `ClassToken` to opt into resolution.

### Story: Delay class-instance construction

As an application developer, I can configure lazy class-instance resolution so
that expensive services are not constructed until they are actually used.

Acceptance criteria:

- A lazy class provider returns a proxy before the underlying instance is
  accessed.
- The underlying instance is constructed on first property or method access.
- Repeated access uses the same constructed instance for that lazy proxy.

### Story: Eagerly create a provider instance

As an application developer, I can mark a provider as auto-resolvable so that
services which work on their own — schedulers, subscribers, warm caches — exist
without anyone injecting them first.

Acceptance criteria:

- An auto-resolvable provider is created when its scope is created, provided the
  container opted into `AutoResolveModule`.
- Without that module, marking a provider as auto-resolvable changes nothing.
- Eager creation reuses the provider's own caching, so a singleton provider
  returns the eagerly created instance for later resolution.
- Eager creation forwards optional `args` to the provider the same way ordinary
  resolution does.

### Story: Restrict provider visibility

As an application architect, I can add provider access rules so that a provider
stored in one scope can allow or deny resolution from another invocation scope.

Acceptance criteria:

- `scopeAccess` receives the previous rule's boolean result and both scope
  references (`invocationScope`, `providerScope`), enabling reducer-style
  composition across multiple rules.
- Multiple `scopeAccess` rules compose as a left-fold starting from `true`: each
  rule receives the accumulated result of all previous rules.
- A provider that denies access is skipped during normal resolution.
- Denied alias providers are not returned in alias-group resolution.

### Story: Decorate provider results

As a maintainer, I can wrap provider results so that cross-cutting behavior such
as logging, instrumentation, or validation can be added without changing the
underlying service implementation.

Acceptance criteria:

- `decorate` receives the resolved dependency and resolving scope.
- The decorated value is returned to the caller.
- Decoration composes with other provider pipes in declared order.

### Story: Observe resolved dependencies

As an application architect, I can attach `onResolve` hooks to a provider so
that cross-cutting concerns such as tracking, logging, or registering the
dependency elsewhere run on resolution without changing the resolved value.

Acceptance criteria:

- `onResolve` receives the resolved dependency and the resolving scope.
- Unlike `decorate`, an `onResolve` hook cannot replace the dependency — its
  return value is ignored and the caller receives the value the pipes produced.
- Hooks run after every `decorate` mapper, so they observe the fully decorated
  dependency regardless of where `onResolve` appears in the pipe chain.
- Multiple hooks run in the order they were declared.
- A hook that throws propagates out of `resolve`.
- Hooks run per resolution, so a non-singleton provider fires them on every
  resolve, while a singleton provider fires them only on the resolve that fills
  the cache.

### Story: Reach the injector for an unregistered class

As an application developer, I can resolve a class by its constructor and still
get provider-level behavior so that a class I never registered is not a hole in
the container's lifecycle.

Acceptance criteria:

- `container.resolve(SomeClass)` stands the class up behind a
  `TransientProvider` over `IContainer.construct`, created on first use.
- The provider hands out the pure injector value, or a lazy proxy of it when the
  resolve asked for one.
- It carries nothing else — no cache, decorators, access rules, or args
  functions — so a new instance leaves it on every resolve and a
  `@register(singleton())` on the class does not apply.
- The container announces it to `onProviderRegistered`, so `onResolved` hooks
  reach classes which were never registered.
- One is kept per class per scope, identified by the constructor rather than its
  name, and disposed with the scope that made it.
- `provider instanceof TransientProvider` distinguishes a made-up provider from
  a declared one.

## Notes

Provider pipes are a public extension point. Specs should describe observable
composition and ordering, not the internal wrapper classes.

`TransientProvider` is the exception: it is named in the public API on purpose,
so the provider a container makes up for a bare-constructor resolve can be
talked about and recognized.
