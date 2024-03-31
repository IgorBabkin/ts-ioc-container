import { AliasPredicate, DependencyKey, IContainer, InjectionToken, Tagged } from './IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';
import { IProvider } from '../provider/IProvider';

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

  abstract resolveFromChild<T>(child: Tagged, key: InjectionToken<T>, ...args: unknown[]): T;

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
