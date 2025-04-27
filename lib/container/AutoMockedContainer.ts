import {
  type DependencyKey,
  type IContainer,
  type Instance,
  type ResolveManyOptions,
  type ResolveOneOptions,
  type Tag,
} from './IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { type IRegistration } from '../registration/IRegistration';
import { type constructor } from '../utils';
import { InjectOptions } from '../injector/IInjector';

export abstract class AutoMockedContainer implements IContainer {
  isDisposed = false;

  createScope(): IContainer {
    throw new MethodNotImplementedError();
  }

  dispose(): void {}

  register(): this {
    return this;
  }

  getParent() {
    return undefined;
  }

  getScopes() {
    return [];
  }

  getInstances(): Instance[] {
    return [];
  }

  hasTag(tag: Tag): boolean {
    return false;
  }

  removeScope(): void {}

  useModule(): this {
    return this;
  }

  getRegistrations() {
    return [];
  }

  addRegistration(registration: IRegistration): this {
    return this;
  }

  abstract resolveMany<T>(alias: DependencyKey, options?: ResolveManyOptions): T[];

  abstract resolveClass<T>(target: constructor<T>, options?: InjectOptions): T;

  abstract resolveOneByKey<T>(keyOrAlias: DependencyKey, options?: ResolveOneOptions): T;

  abstract resolveOneByAlias<T>(keyOrAlias: DependencyKey, options?: ResolveOneOptions): T;

  abstract resolveOne<T>(alias: constructor<T> | DependencyKey, options?: ResolveManyOptions): T;
}
