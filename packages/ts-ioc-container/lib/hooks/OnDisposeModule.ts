import type { IContainer, IContainerModule } from '../container/IContainer';
import { HookCollector, type HookRunner } from './HookCollector';

/**
 * Hands `run` whatever `collector` finds on every instance of a scope being
 * disposed — one flat list, so `run` orders the instances as well as the
 * members (ADR 0016). The hook key is the collector's (ADR 0017). `run` is not
 * called when the scope holds no such hooks.
 *
 * Disposal is a scope event, so the module hangs off `IContainer.scopeDisposed`.
 * Disposal is local: disposing a parent collects nothing from child scopes.
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
