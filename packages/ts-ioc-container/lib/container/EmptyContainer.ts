import {
  AliasPredicate,
  DependencyKey,
  IContainer,
  IContainerModule,
  InjectionToken,
  ResolveOptions,
} from './IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';
import { IProvider } from '../provider/IProvider';
import { IRegistration } from '../provider/Registration.ts';

export class EmptyContainer implements IContainer {
  isDisposed = false;

  getKeysByAlias(alias: AliasPredicate): DependencyKey[] {
    return [];
  }

  hasDependency(key: string): boolean {
    return false;
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

  register(key: DependencyKey, value: IProvider): this {
    throw new MethodNotImplementedError();
  }

  resolve<T>(key: InjectionToken<T>, options: ResolveOptions): T {
    throw new DependencyNotFoundError(`Cannot find ${key.toString()}`);
  }

  getRegistrations() {
    return [];
  }

  getInstances(): unknown[] {
    return [];
  }

  removeScope(): void {}

  use(module: IContainerModule): this {
    throw new MethodNotImplementedError();
  }

  addRegistration(registration: IRegistration): this {
    return this;
  }
}
