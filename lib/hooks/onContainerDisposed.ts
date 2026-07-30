import { hook, HookClass, HookFn } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { HooksRunner } from './HooksRunner';
import { type constructor } from '../utils/basic';

export const onContainerDisposedHooksRunner = new HooksRunner('onContainerDisposed');
export const onContainerDisposed = (...fns: (HookFn | constructor<HookClass>)[]) => hook('onContainerDisposed', ...fns);

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
