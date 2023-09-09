import {
  IContainer,
  InjectionToken,
  IProvider,
  MethodNotImplementedError,
  DependencyKey,
  Tag,
  IContainerModule,
} from '../index';

export abstract class AutoMockedContainer implements IContainer {
  createScope(...tags: Tag[]): IContainer {
    throw new MethodNotImplementedError();
  }

  abstract resolve<T>(key: InjectionToken<T>): T;

  dispose(): void {}

  getProviders(): Map<DependencyKey, IProvider> {
    return new Map();
  }

  register(key: DependencyKey, value: IProvider): this {
    throw new MethodNotImplementedError();
  }

  getInstances(): unknown[] {
    return [];
  }

  removeScope(): void {}

  add(module: IContainerModule): this {
    throw new MethodNotImplementedError();
  }
}
