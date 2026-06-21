import { hook, HookClass, HookFn } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { constructor, Instance } from '../utils/basic';
import { HooksRunner } from './HooksRunner';
import type { ExecutionContext } from '../ExecutionContext';

export const onConstructHooksRunner = new HooksRunner('onConstruct');
export const onConstruct = (...fns: (HookFn | constructor<HookClass>)[]) => hook('onConstruct', ...fns);

export type OnConstructHook = (instance: Instance, scope: IContainer) => void;

export type OnExceptionHandler = (ex: unknown, context: ExecutionContext) => void;

export class AddOnConstructHookModule implements IContainerModule {
  constructor(private readonly onException?: OnExceptionHandler) {}

  applyTo(container: IContainer) {
    container.addOnConstructHook((instance, scope) => {
      try {
        onConstructHooksRunner.execute(instance, { scope });
      } catch (ex) {
        if (!this.onException) {
          throw ex;
        }
        this.onException(ex, { scope });
      }
    });
  }
}
