import { hook, HookType, prependHooks } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { HooksRunner } from './HooksRunner';

export const onContainerDisposedHooksRunner = new HooksRunner('onContainerDisposed');
// Decorators are applied bottom-up, so hooks are prepended to keep them in declaration order:
// `@onX(h1) @onX(h2) method()` runs h1 before h2.
export const onContainerDisposed = (...fns: HookType[]) => hook('onContainerDisposed', prependHooks(...fns));

export type OnDisposeHook = (scope: IContainer) => void;

export class AddOnDisposeHookModule implements IContainerModule {
  applyTo(container: IContainer) {
    container.addOnDisposeHook((scope) => {
      for (const instance of scope.getInstances()) {
        onContainerDisposedHooksRunner.execute(instance, { scope });
      }
    });
  }
}
