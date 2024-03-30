import { IContainer, InjectionToken, IProvider, MethodNotImplementedError, DependencyKey } from '../index';
import { AliasPredicate } from './IContainer';

export abstract class AutoMockedContainer implements IContainer {
  getKeysByAlias(alias: AliasPredicate): DependencyKey[] {
    return [];
  }

  hasDependency(key: string): boolean {
    return false;
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
