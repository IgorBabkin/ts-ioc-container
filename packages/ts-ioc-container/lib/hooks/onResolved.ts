import type { IContainer, IContainerModule } from '../container/IContainer';
import type { ProviderHook } from '../provider/IProvider';
import { type HookExecutionStrategy } from './HookExecutionStrategy';
import { registerPipe } from '../registration/IRegistration';
import { Is } from '../utils/basic';
import { hook, type HookType } from './hook';

// A member carries one hook: declare several with `sequential(...)`/`parallel(...)`,
// as in `@onResolved(sequential(h1, h2))`.
export const onResolved = (fn: HookType) => hook('onResolved', fn);

// Hook metadata lives on classes, so a primitive dependency has nothing to run.
const runHooks =
  (strategy: HookExecutionStrategy): ProviderHook =>
  (dependency, scope) => {
    if (Is.object(dependency)) {
      strategy.execute(dependency, { scope });
    }
  };

/**
 * Runs `onResolved` hooks every time a dependency object leaves a provider, the
 * way `strategy` defines (key it to `onResolved`).
 * Providers are hooked through the `registered` event, so apply the module before
 * the registrations it should cover; scopes created afterwards inherit it.
 */
export class OnResolvedModule implements IContainerModule {
  private readonly runHooks: ProviderHook;

  constructor(strategy: HookExecutionStrategy) {
    this.runHooks = runHooks(strategy);
  }

  applyTo(container: IContainer) {
    container.registered.subscribe((provider) => {
      provider.onResolved(this.runHooks);
    });
  }
}

/**
 * Per-registration form of {@link OnResolvedModule}: the piped registration runs
 * its `onResolved` hooks on resolve, without the container opting every other
 * registration in.
 */
export const resolved = <T = unknown>(strategy: HookExecutionStrategy) =>
  registerPipe<T>((p) => p.onResolved(runHooks(strategy)));
