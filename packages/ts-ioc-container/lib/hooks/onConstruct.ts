import { hook, type HookType } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { type HookExecutionStrategy } from './HookExecutionStrategy';

// A member carries one hook: declare several with `sequential(...)`/`parallel(...)`,
// as in `@onConstruct(sequential(h1, h2))`.
export const onConstruct = (fn: HookType) => hook('onConstruct', fn);

/**
 * Runs `onConstruct` hooks when an instance is constructed, the way `strategy`
 * defines (key it to `onConstruct`).
 *
 * Construction is the injector's event, so the module registers on the
 * container's injector; the injector is shared by every scope the container
 * creates, so applying the module once covers the whole scope tree.
 */
export class OnConstructModule implements IContainerModule {
  constructor(private readonly strategy: HookExecutionStrategy) {}

  applyTo(container: IContainer) {
    container.getInjector().onConstructed((instance, scope) => {
      this.strategy.execute(instance, { scope });
    });
  }
}
