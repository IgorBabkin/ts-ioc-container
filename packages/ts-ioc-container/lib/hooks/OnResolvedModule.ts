import type { IContainer, IContainerModule } from '../container/IContainer';
import type { ProviderHook } from '../provider/IProvider';
import { HookCollector, type HookRunner } from './HookCollector';
import { registerPipe } from '../registration/IRegistration';
import { Is } from '../utils/basic';

// Hook metadata lives on classes, so a primitive dependency has nothing to collect.
const runHooks =
  (run: HookRunner, collector: HookCollector): ProviderHook =>
  (dependency, scope) => {
    if (Is.object(dependency)) {
      const actions = collector.getActions(dependency, { scope });
      if (actions.length > 0) {
        run(actions, { scope });
      }
    }
  };

/**
 * Hands `run` whatever `collector` finds on every dependency object leaving a
 * provider. The hook key is the collector's (ADR 0017) and how the actions run
 * is `run`'s business (ADR 0016).
 *
 * Providers are hooked through the `registered` event, so apply the module before
 * the registrations it should cover; scopes created afterwards inherit it.
 */
export class OnResolvedModule implements IContainerModule {
  private readonly runHooks: ProviderHook;

  constructor(run: HookRunner, collector: HookCollector) {
    this.runHooks = runHooks(run, collector);
  }

  applyTo(container: IContainer) {
    container.registered.subscribe((provider) => {
      provider.onResolved(this.runHooks);
    });
  }
}

/**
 * Per-registration form of {@link OnResolvedModule}: the piped registration runs
 * the collected hooks on resolve, without the container opting every other
 * registration in.
 */
export const resolved = <T = unknown>(run: HookRunner, collector: HookCollector) =>
  registerPipe<T>((p) => p.onResolved(runHooks(run, collector)));
