import { AliasPredicate, DependencyKey, IContainer, InjectionToken, Instance, ResolveOptions } from './IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { IRegistration } from '../registration/IRegistration';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';

export abstract class AutoMockedContainer implements IContainer {
  parent: IContainer | undefined;
  scopes: Set<IContainer> = new Set();
  instances: Set<Instance> = new Set();
  tags: Set<string> = new Set();
  isDisposed = false;

  hasProvider(key: string): boolean {
    return false;
  }

  createScope(): IContainer {
    throw new MethodNotImplementedError();
  }

  abstract resolve<T>(key: InjectionToken<T>, options?: ResolveOptions): T;

  dispose(): void {}

  register(): this {
    return this;
  }

  getInstances(): object[] {
    return [];
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

  resolveManyByAlias(
    predicate: AliasPredicate,
    options: ResolveOptions = {},
    result: Map<DependencyKey, unknown> = new Map(),
  ): Map<DependencyKey, unknown> {
    return result;
  }

  resolveOneByAlias<T>(predicate: AliasPredicate, options?: ResolveOptions): [DependencyKey, T] {
    throw new DependencyNotFoundError(`Cannot find by alias`);
  }
}
