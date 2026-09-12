import {
  type HookCollector,
  type HookRunner,
  type IContainer,
  type IContainerModule,
  Is,
  onResolve,
  type ProviderHook,
} from '../../lib';

// The library wires no hooks (ADR 0018): it collects, and the container's own
// events — the injector's `onConstructed`, the scope's `scopeDisposed`, a
// provider's `onResolved` — are where a consumer hangs that collection. These
// three modules are what that looks like, and all that the modules the library
// used to ship contained.

const performOn =
  (run: HookRunner, collector: HookCollector) =>
  (target: object, scope: IContainer): void => {
    const actions = collector.getActions(target, { scope });
    if (actions.length > 0) {
      run(actions, { scope });
    }
  };

/** Collects from every instance as it is constructed. Construction is the injector's event. */
export class OnConstructModule implements IContainerModule {
  private readonly perform: (target: object, scope: IContainer) => void;

  constructor(run: HookRunner, collector: HookCollector) {
    this.perform = performOn(run, collector);
  }

  applyTo(container: IContainer) {
    container.getInjector().onConstructed((instance, scope) => this.perform(instance, scope));
  }
}

/**
 * Collects from every instance of a scope being disposed, as one flat list, so
 * the runner orders the instances as well as the members.
 */
export class OnDisposeModule implements IContainerModule {
  constructor(
    private readonly run: HookRunner,
    private readonly collector: HookCollector,
  ) {}

  applyTo(container: IContainer) {
    container.scopeDisposed.subscribe((scope) => {
      const actions = scope.getInstances().flatMap((instance) => this.collector.getActions(instance, { scope }));
      if (actions.length > 0) {
        this.run(actions, { scope });
      }
    });
  }
}

// Hook metadata lives on classes, so a primitive dependency has nothing to collect.
const onResolvedHook = (run: HookRunner, collector: HookCollector): ProviderHook => {
  const perform = performOn(run, collector);
  return (dependency, scope) => {
    if (Is.object(dependency)) {
      perform(dependency, scope);
    }
  };
};

/**
 * Collects from every dependency object leaving a provider. Providers are reached
 * through the `registered` event, so apply this before the registrations it covers.
 */
export class OnResolvedModule implements IContainerModule {
  private readonly hook: ProviderHook;

  constructor(run: HookRunner, collector: HookCollector) {
    this.hook = onResolvedHook(run, collector);
  }

  applyTo(container: IContainer) {
    container.registered.subscribe((provider) => {
      provider.onResolved(this.hook);
    });
  }
}

/** The per-registration form: the `onResolve` pipe over the same collection. */
export const resolved = <T = unknown>(run: HookRunner, collector: HookCollector) =>
  onResolve<T>(onResolvedHook(run, collector));
