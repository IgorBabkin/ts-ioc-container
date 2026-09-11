import { hook, type HookType, prependHooks } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { type HookExecutionStrategy } from './HookExecutionStrategy';

// Decorators are applied bottom-up, so hooks are prepended to keep them in declaration order:
// `@onX(h1) @onX(h2) method()` runs h1 before h2.
export const onScopeDisposed = (...fns: HookType[]) => hook('onScopeDisposed', prependHooks(...fns));

/**
 * Runs the `@onScopeDisposed` hooks of every instance of a scope being disposed,
 * the way `strategy` defines (key it to `onScopeDisposed`).
 *
 * Disposal is a scope event, so the module hangs off `IContainer.onScopeDisposed`.
 * Disposal is local: disposing a parent runs no child-scope hooks.
 */
export class OnDisposeModule implements IContainerModule {
  constructor(private readonly strategy: HookExecutionStrategy) {}

  applyTo(container: IContainer) {
    container.onScopeDisposed((scope) => {
      for (const instance of scope.getInstances()) {
        this.strategy.execute(instance, { scope });
      }
    });
  }
}
