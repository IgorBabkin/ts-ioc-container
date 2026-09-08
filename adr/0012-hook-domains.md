# ADR 0012 — Hook registration lives with the domain which raises the event

- **Status:** Accepted
- **Date:** 2026-09-08
- **Deciders:** core maintainers
- **Tags:** hooks, lifecycle, api-design

## Context

[ADR 0007](0007-lifecycle-hooks.md) established hook *declaration* — metadata on
a class, executed by `HooksRunner`, activated by opt-in modules. It said nothing
about where the imperative side lives: the callback lists the container
machinery actually walks.

Those lists all accumulated on `IContainer`:

```typescript
container
  .onConstruct(...)          // an instance was constructed
  .onInstanceDisposed(...)   // actually: this scope was disposed
  .onScopeCreated(...)       // a child scope was created
  .onProviderRegistered(...) // a provider entered the provider map
```

Only two of those four are the container's own events. Construction belongs to
the injector, which is the abstraction that calls `new Target(...)`; the
container merely forwarded to it and then fanned out hooks from `addInstance`.
Resolution belongs to the provider, and indeed already had
`IProvider.onResolve` — so resolve hooks were registered in a different place
from every other hook, for no reason a reader could see from the API.

The type names hid the same confusion. `InstanceHook` and `DependencyHook` were
distinguished by the shape of their payload rather than by the domain that
raised them, and `ProviderHook` named the *provider-registered* event, which is
a scope event about a provider — not a hook the provider itself raises.
`onInstanceDisposed` took a scope and ran on scope disposal, so its name
described neither its argument nor its trigger.

## Decision

Register each hook on the abstraction which raises its event, and name the hook
type after that domain. Three domains, three owners:

| Domain   | Owner        | Type             | Methods                             |
| -------- | ------------ | ---------------- | ----------------------------------- |
| Scope    | `IContainer` | `ScopeHook`      | `onScopeCreated`, `onScopeDisposed` |
| Scope    | `IContainer` | `RegisteredHook` | `onRegistered`                      |
| Injector | `IInjector`  | `InjectorHook`   | `onConstructed`                     |
| Provider | `IProvider`  | `ProviderHook`   | `onResolved`                        |

Each hook type is declared in the file of the abstraction that owns it, rather
than collected in `IContainer.ts`.

### The injector is configured before the container receives it

`IContainer` gets **no** `getInjector()`. A container does not expose its
collaborators, and an injector is not something a container hands out — it is
something a container is given. Injector hooks are therefore registered on the
injector at construction time, before it is passed in:

```typescript
const injector = new MetadataInjector().onConstructed(runMetrics);
const container = new Container({ injector });
```

`Container.addInstance` goes back to only tracking an instance; the abstract
`Injector` base runs the construct hooks itself, right after handing the
instance to the scope.

### Construct modules are injector modules

`OnConstructModule` and `OnConstructAsyncModule` are no longer
`IContainerModule`s. They implement a new `IInjectorModule`
(`applyTo(injector: IInjector)`), the exact mirror of `IContainerModule`, and
the `Injector` base gets `useModule` for the same fluent shape the container
has:

```typescript
const injector = new MetadataInjector().useModule(new OnConstructModule());
const container = new Container({ injector });
```

`OnDisposeModule` stays a container module (`onScopeDisposed`), as do
`OnResolvedModule` and `OnResolvedAsyncModule`, which reach every provider
through `onRegistered`.

`IInjector` therefore requires `onConstructed`. Injectors extending the
`Injector` base inherit it and `useModule`; an injector implementing the
interface from scratch owns its own hook list, or returns `this` to decline the
domain.

### Renames

A clean break, with no deprecated aliases:

| Before                         | After                       |
| ------------------------------ | --------------------------- |
| `container.onConstruct`        | `injector.onConstructed`    |
| `container.onInstanceDisposed` | `container.onScopeDisposed` |
| `container.onProviderRegistered` | `container.onRegistered`  |
| `provider.onResolve`           | `provider.onResolved`       |
| `InstanceHook`                 | `InjectorHook`              |
| `DependencyHook`               | `ProviderHook`              |
| `ProviderHook`                 | `RegisteredHook`            |
| `OnDisposeHook`                | `ScopeHook` (folded in)     |
| `ResolvedDependencyHook`       | `ResolvedObjectHook`        |

`onRegistered` drops the `Provider` qualifier because registration is always of
a provider — the name keeps only what varies, the key it registered under.

The `@onConstruct`, `@onContainerDisposed` and `@onResolved` decorators, the
hook keys they write, and the `onResolve(...)` registration pipe keep their
names: they are declarations on a class or a registration, not domain event
registration.

## Consequences

**Positive**

- Where a hook is registered now tells you which subsystem raises it, and the
  hook's type names that same subsystem.
- `onScopeDisposed` describes both its argument and its trigger.
- `Container` sheds a hook list, the fan-out in `addInstance`, and any accessor
  for its injector; construct hooks live next to the code that constructs.
- `createScope` no longer copies construct hooks into the child — the child gets
  the same injector, so it gets the hooks by construction.
- A custom injector can participate in the construct domain, which was
  previously reachable only through the container.
- Injector configuration is complete before the container exists, so there is no
  window in which a container is live but its construct hooks are not.

**Negative / trade-offs**

- Breaking change for anyone calling the imperative hook API or naming the hook
  types. A major version bump, and no alias shim to soften it.
- Enabling construct hooks is now two statements instead of one chained
  `useModule`, and needs the injector named explicitly — including the
  `MetadataInjector` that used to be an invisible default.
- Code holding only an `IContainer` cannot register construct hooks at all. That
  is the point, but it means a container module can no longer enable them; such
  a module has to be split into a container half and an injector half.
- One injector backs a container and every scope created from it, so
  `onConstructed` is tree-wide. A per-scope construct hook needs a scope check
  inside the hook, or a separate injector for that subtree.
- `IInjector` is no longer a single-method interface, so a from-scratch injector
  has one more member to implement.

> [!NOTE]
> The `Async`-postfixed decorators and modules named throughout this record were
> later removed, and `@onContainerDisposed` renamed to `@onScopeDisposed`, by
> [ADR 0013](0013-one-async-capable-hook-path.md).

## References

- [ADR 0013 — One async-capable hook path, no `Async` variants](0013-one-async-capable-hook-path.md)
- `lib/container/IContainer.ts` — `ScopeHook`, `RegisteredHook`
- `lib/injector/IInjector.ts` — `InjectorHook`, `IInjectorModule`, `Injector.onConstructed`
- `lib/provider/IProvider.ts` — `ProviderHook`, `IProvider.onResolved`
- `lib/hooks/onConstruct.ts`, `lib/hooks/onConstructAsync.ts`
- `lib/hooks/onContainerDisposed.ts`
- `__tests__/specs/lifecycle-hooks.spec.ts`
- [ADR 0007 — Lifecycle hooks via reflect-metadata and opt-in modules](0007-lifecycle-hooks.md)
- [ADR 0002 — Pluggable injector strategies](0002-pluggable-injectors.md)
