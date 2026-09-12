import type { IContainer, IContainerModule } from '../container/IContainer';
import { HookCollector, type HookRunner } from './HookCollector';

/**
 * Hands `run` whatever `collector` finds on every instance as it is
 * constructed. The hook key is the collector's, so the key and the decorator
 * declaring it are yours (ADR 0017): this module knows only the event. How the
 * actions run is `run`'s business (ADR 0016), and `run` is not called when an
 * instance declares no hook under that key.
 *
 * Construction is the injector's event, so the module registers on the
 * container's injector; the injector is shared by every scope the container
 * creates, so applying the module once covers the whole scope tree.
 *
 * ```typescript
 * const onConstruct = (fn: HookType) => hook('onConstruct', fn);
 * container.useModule(new OnConstructModule(run, new HookCollector({ key: 'onConstruct' })));
 * ```
 */
export class OnConstructModule implements IContainerModule {
  constructor(
    private readonly run: HookRunner,
    private readonly collector: HookCollector,
  ) {}

  applyTo(container: IContainer) {
    container.getInjector().onConstructed((instance, scope) => {
      const actions = this.collector.getActions(instance, { scope });
      if (actions.length > 0) {
        this.run(actions, { scope });
      }
    });
  }
}
