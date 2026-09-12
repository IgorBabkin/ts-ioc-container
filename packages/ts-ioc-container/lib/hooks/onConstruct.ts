import { hook, type HookType } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { HookCollector, type HookRunner } from './HookCollector';

// A member carries one hook: declare several with `sequential(...)`/`parallel(...)`,
// as in `@onConstruct(sequential(h1, h2))`.
export const onConstruct = (fn: HookType) => hook('onConstruct', fn);

/**
 * Hands `run` the `onConstruct` hooks of every instance as it is constructed.
 * How they run — in what order, what is awaited, where a failure goes — is
 * `run`'s business (ADR 0016); `run` is not called when an instance declares none.
 *
 * Construction is the injector's event, so the module registers on the
 * container's injector; the injector is shared by every scope the container
 * creates, so applying the module once covers the whole scope tree.
 */
export class OnConstructModule implements IContainerModule {
  constructor(
    private readonly run: HookRunner,
    private readonly collector: HookCollector = new HookCollector({ key: 'onConstruct' }),
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
