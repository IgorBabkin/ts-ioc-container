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
import { OnDisposeHook } from '../hooks/onDispose';
import { OnConstructHook } from '../hooks/onConstruct';
import { type constructor, type Instance } from '../utils/basic';

export class EmptyContainer implements IContainer {
  get isDisposed(): boolean {
    throw new MethodNotImplementedError();
  }

  addInstance(instance: Instance) {}

  getParent() {
    return undefined;
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

  resolve<T>(key: constructor<T> | DependencyKey, options?: ResolveOneOptions): T {
    throw new DependencyNotFoundError(`Cannot find ${key.toString()}`);
  }

  resolveByAlias<T>(alias: DependencyKey, options?: ResolveManyOptions): T[] {
    return [];
  }

  resolveOneByAlias<T>(alias: DependencyKey, options?: ResolveOneOptions): T {
    throw new DependencyNotFoundError(`Cannot find alias ${alias.toString()}`);
  }

  addOnDisposeHook(...hooks: OnDisposeHook[]): this {
    throw new MethodNotImplementedError();
  }

  addOnConstructHook(...hooks: OnConstructHook[]): this {
    throw new MethodNotImplementedError();
  }
}
