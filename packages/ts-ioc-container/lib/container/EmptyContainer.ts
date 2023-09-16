import { DependencyKey, IContainer, IContainerModule, InjectionToken, Tag } from './IContainer';
import { MethodNotImplementedError } from './MethodNotImplementedError';
import { DependencyNotFoundError } from './DependencyNotFoundError';
import { IProvider } from '../provider/IProvider';

export class EmptyContainer implements IContainer {
  hasTag(tag: Tag): boolean {
    throw new MethodNotImplementedError();
  }

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

  getAllProviders(): Map<DependencyKey, IProvider> {
    return new Map();
  }

  cloneAndImportProvidersFrom(): void {
    throw new MethodNotImplementedError();
  }

  getInstances(): unknown[] {
    return [];
  }

  removeScope(): void {}

  use(module: IContainerModule): this {
    throw new MethodNotImplementedError();
  }
}
