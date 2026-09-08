import { hook, HookType, prependHooks } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { HooksRunner, type OnExceptionHandler, runHooks } from './HooksRunner';

export const onScopeDisposedHooksRunner = new HooksRunner('onScopeDisposed');
// Decorators are applied bottom-up, so hooks are prepended to keep them in declaration order:
// `@onX(h1) @onX(h2) method()` runs h1 before h2.
export const onScopeDisposed = (...fns: HookType[]) => hook('onScopeDisposed', prependHooks(...fns));

/**
 * Runs the `@onScopeDisposed` hooks of every instance of a scope being disposed.
 *
 * Disposal is a scope event, so the module hangs off `IContainer.onScopeDisposed`
 * — the imperative side of the same event the decorator names. Disposal is
 * local: disposing a parent runs no child-scope hooks.
 *
 * Sync hooks finish before `dispose` returns; async ones are started there and
 * settle afterwards.
 */
export class OnDisposeModule implements IContainerModule {
  constructor(private readonly onException?: OnExceptionHandler) {}

  applyTo(container: IContainer) {
    /**
     * @throws {unknown} rethrows whatever the `onScopeDisposed` hooks threw or rejected with, when no
     * `onException` handler was supplied — synchronously for a sync hook, as an unhandled promise rejection for
     * an async one.
     */
    container.onScopeDisposed((scope) => {
      for (const instance of scope.getInstances()) {
        runHooks(onScopeDisposedHooksRunner, instance, scope, this.onException);
      }
    });
  }
}
