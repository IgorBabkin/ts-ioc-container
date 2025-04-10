import {
  type DependencyKey,
  type IContainer,
  type IContainerModule,
  type ResolveManyOptions,
  type ResolveOneOptions,
  type Tag,
} from './IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';
import { type IProvider } from '../provider/IProvider';
import { type IRegistration } from '../registration/IRegistration';
import { type constructor } from '../utils';

export class EmptyContainer implements IContainer {
  get isDisposed(): boolean {
    throw new MethodNotImplementedError();
  }

  getParent() {
    return undefined;
  }

  resolveByClass<T>(token: constructor<T>, options?: { args?: [] }): T {
    throw new MethodNotImplementedError();
  }

  getScopes() {
    return [];
  }

  getInstances() {
    return [];
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

  hasTag(tag: Tag): boolean {
    throw new MethodNotImplementedError();
  }

  getRegistrations() {
    return [];
  }

  removeScope(): void {}

  useModule(module: IContainerModule): this {
    throw new MethodNotImplementedError();
  }

  addRegistration(registration: IRegistration): this {
    throw new MethodNotImplementedError();
  }

  resolveMany<T>(alias: DependencyKey, options?: ResolveManyOptions): T[] {
    return [];
  }

  resolveOne<T>(key: constructor<T> | DependencyKey, options?: ResolveManyOptions): T {
    throw new DependencyNotFoundError(`Cannot find ${key.toString()}`);
  }

  resolveOneByKey<T>(key: DependencyKey, options?: ResolveOneOptions): T {
    throw new DependencyNotFoundError(`Cannot find ${key.toString()}`);
  }

  resolveOneByAlias<T>(key: DependencyKey, options?: ResolveOneOptions): T {
    throw new DependencyNotFoundError(`Cannot find ${key.toString()}`);
  }
}
