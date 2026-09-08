import { hook, HookType, prependHooks } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { HooksRunner } from './HooksRunner';

export const onContainerDisposedHooksRunner = new HooksRunner('onContainerDisposed');
// Decorators are applied bottom-up, so hooks are prepended to keep them in declaration order:
// `@onX(h1) @onX(h2) method()` runs h1 before h2.
export const onContainerDisposed = (...fns: HookType[]) => hook('onContainerDisposed', prependHooks(...fns));

/**
 * Runs `onContainerDisposed` hooks on every instance of a scope being disposed.
 *
 * A scope's disposal is a scope event, so the module hangs off
 * `onScopeDisposed`. Disposal is local: disposing a parent runs no child-scope
 * hooks.
 */
export class OnDisposeModule implements IContainerModule {
  applyTo(container: IContainer) {
    container.onScopeDisposed((scope) => {
      for (const instance of scope.getInstances()) {
        onContainerDisposedHooksRunner.execute(instance, { scope });
      }
    });
  }
}
