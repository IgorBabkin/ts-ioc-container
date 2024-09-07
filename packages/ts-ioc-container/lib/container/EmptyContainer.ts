import {
  AliasPredicate,
  DependencyKey,
  IContainer,
  IContainerModule,
  InjectionToken,
  ReduceFn,
  ResolveOptions,
  Tag,
} from './IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';
import { IProvider } from '../provider/IProvider';
import { IRegistration } from '../registration/IRegistration';

export class EmptyContainer implements IContainer {
  hasInstance(value: object): boolean {
    throw new Error('Method not implemented.');
  }

  hasOwnInstance(value: object): boolean {
    throw new Error('Method not implemented.');
  }

  isDisposed = false;
  level = -1;
  id = 'empty';

  tags = new Set<Tag>();

  reduceToRoot<TResult>(fn: ReduceFn<TResult>, initial: TResult): TResult {
    return initial;
  }

  findChild(matchFn: (s: IContainer) => boolean): IContainer | undefined {
    return undefined;
  }

  findParent(matchFn: (s: IContainer) => boolean): IContainer | undefined {
    return undefined;
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

  getInstances(): object[] {
    return [];
  }

  removeScope(): void {}

  use(module: IContainerModule): this {
    throw new MethodNotImplementedError();
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
