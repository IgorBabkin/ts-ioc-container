import { hook, HookType, prependHooks } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { HookExecutionStrategy } from './HooksExecutionStrategy';

export const onScopeDisposed = (...fns: HookType[]) => hook('onScopeDisposed', prependHooks(...fns));

export class OnDisposeModule implements IContainerModule {
  constructor(private readonly executionStrategy: HookExecutionStrategy) {}

  applyTo(container: IContainer) {
    container.onScopeDisposed((scope) => {
      for (const instance of scope.getInstances()) {
        this.executionStrategy.execute(instance, { scope });
      }
    });
  }
}
