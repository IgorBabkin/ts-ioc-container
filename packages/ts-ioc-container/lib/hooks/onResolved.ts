import type { IContainer, IContainerModule } from '../container/IContainer';
import type { ProviderHook } from '../provider/IProvider';
import { HookExecutionStrategy } from './HooksExecutionStrategy';
import { registerPipe } from '../registration/IRegistration';
import { Is } from '../utils/basic';
import { hook, HookType, prependHooks } from './hook';

export const onResolved = (...hooks: HookType[]) => hook('onResolved', prependHooks(...hooks));

// Hook metadata lives on classes, so a primitive dependency has nothing to run.
const runHooks =
  (executionStrategy: HookExecutionStrategy): ProviderHook =>
  (dependency, scope) => {
    if (Is.object(dependency)) {
      executionStrategy.execute(dependency, { scope });
    }
  };

/**
 * Runs `onResolved` hooks every time a dependency object leaves a provider.
 * Providers are hooked through `onRegistered`, so apply the module before the
 * registrations it should cover; scopes created afterwards inherit it.
 */
export class OnResolvedModule implements IContainerModule {
  private readonly runHooks: ProviderHook;

  constructor(executionStrategy: HookExecutionStrategy) {
    this.runHooks = runHooks(executionStrategy);
  }

  applyTo(container: IContainer) {
    container.onRegistered((provider) => {
      provider.onResolved(this.runHooks);
    });
  }
}

/**
 * Per-registration form of {@link OnResolvedModule}: the piped registration runs
 * its `onResolved` hooks on resolve, without the container opting every other
 * registration in.
 */
export const resolved = <T = unknown>(executionStrategy: HookExecutionStrategy) =>
  registerPipe<T>((p) => p.onResolved(runHooks(executionStrategy)));
