import { DependencyKey, IContainer, IContainerModule, InjectionToken, Tag } from './IContainer';
import { MethodNotImplementedError } from './MethodNotImplementedError';
import { DependencyNotFoundError } from './DependencyNotFoundError';
import { IProvider } from '../provider/IProvider';

export class EmptyContainer implements IContainer {
  createScope(...tags: Tag[]): IContainer {
    throw new MethodNotImplementedError();
  }

  dispose(): void {
    throw new MethodNotImplementedError();
  }

  register(key: DependencyKey, value: IProvider): this {
    throw new MethodNotImplementedError();
  }

  resolve<T>(key: InjectionToken<T>): T {
    throw new DependencyNotFoundError(`Cannot find ${key.toString()}`);
  }

  getProviders(): Map<DependencyKey, IProvider> {
    return new Map();
  }

  getInstances(): unknown[] {
    return [];
  }

  removeScope(): void {}

  add(module: IContainerModule): this {
    throw new MethodNotImplementedError();
  }
}
