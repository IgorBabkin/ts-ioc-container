import { hook, HookType, prependHooks } from './hook';
import { HookExecutionStrategy } from './HooksExecutionStrategy';
import { IContainer, IContainerModule } from '../container/IContainer';

export const onConstruct = (...fns: HookType[]) => hook('onConstruct', prependHooks(...fns));

export class OnConstructModule implements IContainerModule {
  constructor(private readonly executionStrategy: HookExecutionStrategy) {}

  applyTo(container: IContainer) {
    const injector = container.getInjector();
    injector.onConstructed((instance, scope) => {
      this.executionStrategy.execute(instance, {
        scope,
      });
    });
  }
}
