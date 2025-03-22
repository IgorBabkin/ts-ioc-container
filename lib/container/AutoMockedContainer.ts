import {
  AliasPredicate,
  DependencyKey,
  IContainer,
  InjectionToken,
  Instance,
  ResolveManyOptions,
  ResolveOneOptions,
  Tag,
} from './IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { IRegistration } from '../registration/IRegistration';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';
import { constructor } from '../utils';

export abstract class AutoMockedContainer implements IContainer {
  isDisposed = false;

  hasProvider(key: string): boolean {
    return false;
  }

  createScope(): IContainer {
    throw new MethodNotImplementedError();
  }

  dispose(): void {}

  detachFromParent() {
    throw new MethodNotImplementedError();
  }

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

  use(): this {
    return this;
  }

  getRegistrations() {
    return [];
  }

  add(registration: IRegistration): this {
    return this;
  }

  abstract resolveMany<T>(alias: DependencyKey, options?: ResolveManyOptions): T[];

  abstract resolveByClass<T>(target: constructor<T>, options?: { args?: unknown[] }): T;

  abstract resolveOneByKey<T>(keyOrAlias: DependencyKey, options?: ResolveOneOptions): T;

  abstract resolveOneByAlias<T>(keyOrAlias: DependencyKey, options?: ResolveOneOptions): T;

  abstract resolve<T>(alias: constructor<T> | DependencyKey, options?: ResolveManyOptions): T;
}
