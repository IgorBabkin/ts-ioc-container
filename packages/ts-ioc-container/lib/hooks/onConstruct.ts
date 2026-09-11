import { hook, type HookType, prependHooks } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { type HookExecutionStrategy } from './HookExecutionStrategy';

// Decorators are applied bottom-up, so hooks are prepended to keep them in declaration order:
// `@onX(h1) @onX(h2) method()` runs h1 before h2.
export const onConstruct = (...fns: HookType[]) => hook('onConstruct', prependHooks(...fns));

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
