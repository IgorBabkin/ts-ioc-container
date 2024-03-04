import { IContainer, InjectionToken, IProvider, MethodNotImplementedError, DependencyKey } from '../index';

export abstract class AutoMockedContainer implements IContainer {
  hasDependency(key: string): boolean {
    return false;
  }

  getTokensByProvider(): DependencyKey[] {
    return [];
  }

  createScope(): IContainer {
    throw new MethodNotImplementedError();
  }

  abstract resolve<T>(key: InjectionToken<T>): T;

  dispose(): void {}

  register(): this {
    return this;
  }

  getInstances(): unknown[] {
    return [];
  }

  removeScope(): void {}

  use(): this {
    return this;
  }

  getAllProviders(): Map<DependencyKey, IProvider> {
    return new Map();
  }

  hasTag(): boolean {
    return false;
  }
}
