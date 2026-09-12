# ADR 0018 — No hook modules: the container's events are the API

- **Status:** Accepted, completes
  [ADR 0017](0017-no-predefined-hook-keys.md)
- **Date:** 2026-09-12
- **Deciders:** core maintainers
- **Tags:** hooks, lifecycle, api-design

## Context

[ADR 0016](0016-collect-hooks-let-the-caller-run-them.md) gave the caller the
running of hooks; [ADR 0017](0017-no-predefined-hook-keys.md) gave them the keys
and the decorators. What the library still shipped was three container modules —
`OnConstructModule`, `OnDisposeModule`, `OnResolvedModule`, plus the
`resolved(...)` pipe — each holding the last piece: *where* collection hangs.

Once the key came from the caller's collector and the running from the caller's
runner, each module was a single `subscribe` with an emptiness check:

```typescript
applyTo(container: IContainer) {
  container.getInjector().onConstructed((instance, scope) => {
    const actions = this.collector.getActions(instance, { scope });
    if (actions.length > 0) this.run(actions, { scope });
  });
}
```

Everything in that body is already public: `getInjector().onConstructed`,
`scopeDisposed.subscribe`, `registered.subscribe`, `provider.onResolved`, the
`onResolve(...)` pipe, and `IContainerModule` itself — which is one method. The
modules added a class, a constructor argument order, and a name per event, and
took away the ability to vary any of it: to collect two keys from one event, to
filter by scope tag before collecting, to collect from a child scope's instances
on the parent's disposal, or to run one runner across several events.

They also misdescribed the design by existing. ADR 0012 put hook registration
with the domain which raises the event precisely so the *event* would be the
API; a module wrapping that event made it look as though hooks needed the
library's blessing to be wired, and left "custom hooks" reading as an advanced
topic when it is the only topic.

## Decision

**The library wires no hooks.** `OnConstructModule`, `OnDisposeModule`,
`OnResolvedModule` and `resolved(...)` are removed. What remains is the model
(`HookCollector` → `HookAction[]`) and the container's own events, which were
always public:

```typescript
const onConstruct = (fn: HookType) => hook('onConstruct', fn);
const onConstructHooks = new HookCollector({ key: 'onConstruct' });

// a module is just an `applyTo`; the runner's shape is the application's to name
type HookRunner = (actions: HookAction[], context: ExecutionContext) => void;

const onConstructModule = (run: HookRunner): IContainerModule => ({
  applyTo: (container) =>
    container.getInjector().onConstructed((instance, scope) => {
      run(onConstructHooks.getActions(instance, { scope }), { scope });
    }),
});

container.useModule(onConstructModule(immediate));
```

| Event                    | Where it is raised                  | Wire with                       |
| ------------------------ | ----------------------------------- | ------------------------------- |
| an instance is built     | the injector, shared by every scope | `getInjector().onConstructed()` |
| a scope is disposed      | the container                       | `scopeDisposed.subscribe()`     |
| a provider is registered | the container                       | `registered.subscribe()`        |
| a dependency is resolved | the provider                        | `onResolved()`, `onResolve(...)` |

`IContainerModule` stays: it is the generic "apply this wiring to a container"
seam, and `AutoResolveModule` still uses it. The `HookRunner` type goes: it
existed as those module constructors' parameter, and with them gone the library
neither calls a runner nor is handed one, so the shape is the application's to
name — as `__tests__/hooks/runners.ts` does.

The emptiness check the modules performed — not calling the runner when nothing
was collected — goes with them. A runner over an empty array does nothing, and
whether that case deserves a branch is the caller's to decide.

## Consequences

**Positive**

- The library's hook surface is now exactly two things: metadata (`hook`,
  `getHooks`, `hasHooks`) and the model (`HookCollector`, `HookAction`,
  `toTask`, the combinators, `HookContext`). Nothing in it observes a container.
- Wiring is as varied as the application needs it: several keys per event, one
  runner across events, a predicate on the scope before collecting.
- The events stop being an implementation detail behind three classes and become
  the documented API — which is what ADR 0012 decided they were.
- Every hook in every application is written the same way; there is no built-in
  path to compare against.

**Negative / trade-offs**

- Breaking change with no shim: five exports are gone (the four above and the
  `HookRunner` type), and every consumer who
  used them writes the five-line module themselves. `__tests__/hooks/modules.ts`
  keeps that code verbatim, and the README carries it.
- The shortest path to a working construct hook is now a decorator, a collector,
  a runner and a wiring — four pieces, none of them hidden, none of them shared.
- Mistakes the modules made impossible are possible again: subscribing after the
  registrations that should have been covered, or collecting on an event that
  fires more often than intended.

## References

- `lib/hooks/HookCollector.ts` — the model, and the events to wire it to
- `lib/container/IContainer.ts` — `scopeDisposed`, `registered`, `getInjector`, `IContainerModule`
- `lib/injector/IInjector.ts` — `onConstructed`
- `lib/registration/IRegistration.ts` — the `onResolve(...)` pipe
- `__tests__/hooks/modules.ts` — the three modules as consumer code
- [ADR 0012 — Hook registration lives with the domain which raises the event](0012-hook-domains.md)
- [ADR 0016 — The library collects hooks; the caller runs them](0016-collect-hooks-let-the-caller-run-them.md)
- [ADR 0017 — No predefined hook keys or decorators](0017-no-predefined-hook-keys.md)
