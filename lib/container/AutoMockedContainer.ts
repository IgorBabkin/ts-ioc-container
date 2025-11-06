import {
  type DependencyKey,
  type IContainer,
  type Instance,
  type ResolveManyOptions,
  ResolveOneOptions,
  type Tag,
} from './IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { type IRegistration } from '../registration/IRegistration';
import { type constructor } from '../utils';

export abstract class AutoMockedContainer implements IContainer {
  isDisposed = false;

  onInstanceCreated(instance: Instance) {}

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

  abstract resolveByAlias<T>(alias: DependencyKey, options?: ResolveManyOptions): T[];

  abstract resolve<T>(alias: constructor<T> | DependencyKey, options?: ResolveManyOptions): T;

  abstract resolveOneByAlias<T>(alias: DependencyKey, options?: ResolveOneOptions): T;
}
