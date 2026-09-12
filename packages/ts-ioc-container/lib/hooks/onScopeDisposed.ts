import { hook, type HookType } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { HookCollector, type HookRunner } from './HookCollector';

// A member carries one hook: declare several with `sequential(...)`/`parallel(...)`,
// as in `@onScopeDisposed(parallel(flush, close))`.
export const onScopeDisposed = (fn: HookType) => hook('onScopeDisposed', fn);

/**
 * Hands `run` the `@onScopeDisposed` hooks of every instance of a scope being
 * disposed — one flat list, so `run` orders the instances as well as the
 * members (ADR 0016). It is not called when the scope holds no such hooks.
 *
 * Disposal is a scope event, so the module hangs off `IContainer.scopeDisposed`.
 * Disposal is local: disposing a parent collects nothing from child scopes.
 */
export class OnDisposeModule implements IContainerModule {
  constructor(
    private readonly run: HookRunner,
    private readonly collector: HookCollector = new HookCollector({ key: 'onScopeDisposed' }),
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
