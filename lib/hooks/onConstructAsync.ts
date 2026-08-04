import { hook, HookClass, HookFn } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { constructor } from '../utils/basic';
import { HooksRunner } from './HooksRunner';
import type { OnExceptionHandler } from './onConstruct';

export const onConstructAsyncHooksRunner = new HooksRunner('onConstructAsync');
export const onConstructAsync = (...fns: (HookFn | constructor<HookClass>)[]) => hook('onConstructAsync', ...fns);

// Resolution stays synchronous, so async construct hooks are started when the
// instance is tracked and settle afterwards: `resolve` returns before they
// finish. Instances that must expose readiness should publish it themselves,
// for example by storing the pending promise on the instance.
export class AddOnConstructAsyncHookModule implements IContainerModule {
  constructor(private readonly onException?: OnExceptionHandler) {}

  applyTo(container: IContainer) {
    container.addOnConstructHook((instance, scope) => {
      if (!onConstructAsyncHooksRunner.hasHooks(instance)) {
        return;
      }

      onConstructAsyncHooksRunner.executeAsync(instance, { scope }).catch((ex) => {
        if (!this.onException) {
          throw ex;
        }
        this.onException(ex, { scope });
      });
    });
  }
}
