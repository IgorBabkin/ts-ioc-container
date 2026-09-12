import { hook, type HookType } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { type HookExecutionStrategy } from './HookExecutionStrategy';

// A member carries one hook: declare several with `sequential(...)`/`parallel(...)`,
// as in `@onScopeDisposed(parallel(flush, close))`.
export const onScopeDisposed = (fn: HookType) => hook('onScopeDisposed', fn);

/**
 * Runs the `@onScopeDisposed` hooks of every instance of a scope being disposed,
 * the way `strategy` defines (key it to `onScopeDisposed`).
 *
 * Disposal is a scope event, so the module hangs off `IContainer.scopeDisposed`.
 * Disposal is local: disposing a parent runs no child-scope hooks.
 */
export class OnDisposeModule implements IContainerModule {
  constructor(private readonly strategy: HookExecutionStrategy) {}

  applyTo(container: IContainer) {
    container.scopeDisposed.subscribe((scope) => {
      for (const instance of scope.getInstances()) {
        this.strategy.execute(instance, { scope });
      }
    });
  }
}
