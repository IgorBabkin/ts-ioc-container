import {
  AliasPredicate,
  DependencyKey,
  IContainer,
  IContainerModule,
  InjectionToken,
  Instance,
  ReduceScope,
  ResolveOptions,
  Tag,
} from './IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';
import { IProvider } from '../provider/IProvider';
import { IRegistration } from '../registration/IRegistration';
import { TypedEvent } from '../TypedEvent';

export class EmptyContainer implements IContainer {
  level = -1;
  id = 'empty';
  tags = new Set<Tag>();
  isDisposed = false;

  onConstruct = new TypedEvent<Instance>();
  onDispose = new TypedEvent<IContainer>();
  onScopeCreated = new TypedEvent<IContainer>();
  onScopeRemoved = new TypedEvent<IContainer>();

  hasInstance(value: object): boolean {
    throw new MethodNotImplementedError();
  }

  reduceToRoot<TResult>(fn: ReduceScope<TResult>, initial: TResult): TResult {
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

  getOwnInstances(): object[] {
    return [];
  }

  removeScope(): void {
    this.onConstruct.dispose();
    this.onDispose.dispose();
    this.onScopeCreated.dispose();
    this.onScopeRemoved.dispose();
  }

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

  matchTags(tags: Tag[]): boolean {
    return false;
  }
}
