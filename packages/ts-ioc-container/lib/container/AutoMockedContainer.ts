import { IContainer, InjectionToken, IProvider, MethodNotImplementedError, DependencyKey } from '../index';

export abstract class AutoMockedContainer implements IContainer {
  getTokensByProvider(): DependencyKey[] {
    return [];
  }

  createScope(): IContainer {
    throw new MethodNotImplementedError();
  }

  abstract resolve<T>(key: InjectionToken<T>): T;

  dispose(): void {}

  register(): this {
    throw new MethodNotImplementedError();
  }

  getInstances(): unknown[] {
    return [];
  }

  removeScope(): void {}

  use(): this {
    throw new MethodNotImplementedError();
  }

  getAllProviders(): Map<DependencyKey, IProvider> {
    return new Map();
  }

  hasTag(): boolean {
    return false;
  }
}
