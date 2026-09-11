import type { IContainer, IContainerModule } from '../container/IContainer';
import { HookExecutionStrategy } from './HooksExecutionStrategy';
import { registerPipe } from '../registration/IRegistration';
import { Instance } from '../utils/basic';
import { hook, HookType, prependHooks } from './hook';

export const onResolved = (...hooks: HookType[]) => hook('onResolved', prependHooks(...hooks));

export class OnResolvedModule implements IContainerModule {
  constructor(private readonly executionStrategy: HookExecutionStrategy) {}

  applyTo(container: IContainer) {
    for (const registration of container.getRegistrations()) {
      registration.pipe((p) => p.onResolved((d, scope) => this.executionStrategy.execute(d as Instance, { scope })));
    }
  }
}

export const resolved = <T = unknown>(executionStrategy: HookExecutionStrategy) =>
  registerPipe<T>((p) => p.onResolved((d, scope) => executionStrategy.execute(d as Instance, { scope })));
