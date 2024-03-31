import {
  IContainer,
  InjectionToken,
  IProvider,
  MethodNotImplementedError,
  DependencyKey,
  DependencyNotFoundError,
} from '../index';
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

  resolve<T>(key: InjectionToken<T>, ...args: unknown[]): T {
    throw new DependencyNotFoundError(`Cannot find ${key.toString()}`);
  }

  abstract resolveFromChild<T>(key: InjectionToken<T>, ...args: unknown[]): T;

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
