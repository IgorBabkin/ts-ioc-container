import { DependencyKey, IContainer, InjectionToken } from './IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';
import { IProvider } from '../provider/IProvider';

export class EmptyContainer implements IContainer {
  hasDependency(key: string): boolean {
    return false;
  }

  getTokensByProvider(): DependencyKey[] {
    return [];
  }

  hasTag(): boolean {
    throw new MethodNotImplementedError();
  }

  createScope(): IContainer {
    throw new MethodNotImplementedError();
  }

  dispose(): void {
    throw new MethodNotImplementedError();
  }

  register(): this {
    throw new MethodNotImplementedError();
  }

  resolve<T>(key: InjectionToken<T>): T {
    throw new DependencyNotFoundError(`Cannot find ${key.toString()}`);
  }

  getAllProviders(): Map<DependencyKey, IProvider> {
    return new Map();
  }

  getInstances(): unknown[] {
    return [];
  }

  removeScope(): void {}

  use(): this {
    throw new MethodNotImplementedError();
  }
}
