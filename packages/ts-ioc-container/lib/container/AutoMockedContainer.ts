import { AliasPredicate, DependencyKey, IContainer, InjectionToken, ReduceFn, ResolveOptions } from './IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { IRegistration } from '../registration/IRegistration';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';

export abstract class AutoMockedContainer implements IContainer {
  tags: Set<string> = new Set();

  id = '0';

  level = 0;

  isDisposed = false;

  findChild(matchFn: (s: IContainer) => boolean): IContainer | undefined {
    return undefined;
  }

  findParent(matchFn: (s: IContainer) => boolean): IContainer | undefined {
    return undefined;
  }

  hasDependency(key: string): boolean {
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

  reduceToRoot<TResult>(fn: ReduceFn<TResult>, initial: TResult): TResult {
    return initial;
  }

  removeScope(): void {}

  use(): this {
    return this;
  }

  getRegistrations() {
    return [];
  }

  hasTag(): boolean {
    return false;
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

  hasInstance(value: object): boolean {
    throw new Error('Method not implemented.');
  }

  hasOwnInstance(value: object): boolean {
    throw new Error('Method not implemented.');
  }
}
