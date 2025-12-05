import { hook, HookClass, HookFn } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { constructor, Instance } from '../types';
import { HooksRunner } from './HooksRunner';

export const onConstructHooksRunner = new HooksRunner('onConstruct');
export const onConstruct = (fn: HookFn | constructor<HookClass>) => hook('onConstruct', fn);

export type OnConstructHook = (instance: Instance, scope: IContainer) => void;

export class AddOnConstructHookModule implements IContainerModule {
  applyTo(container: IContainer) {
    container.addOnConstructHook((instance, scope) => {
      onConstructHooksRunner.execute(instance, { scope });
    });
  }
}
