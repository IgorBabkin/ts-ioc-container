import {
  AliasPredicate,
  DependencyKey,
  IContainer,
  IContainerModule,
  InjectionToken,
  ResolveOptions,
  Tag,
} from './IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';
import { IProvider } from '../provider/IProvider';
import { IRegistration } from '../registration/IRegistration';

export class EmptyContainer implements IContainer {
  get isDisposed(): boolean {
    throw new MethodNotImplementedError();
  }

  detachFromParent() {
    throw new MethodNotImplementedError();
  }

  hasProvider(key: string): boolean {
    return false;
  }

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

  resolve<T>(key: InjectionToken<T>, options: ResolveOptions): T {
    throw new DependencyNotFoundError(`Cannot find ${key.toString()}`);
  }

  hasTag(tag: Tag): boolean {
    throw new MethodNotImplementedError();
  }

  getRegistrations() {
    return [];
  }

  removeScope(): void {}

  use(module: IContainerModule): this {
    throw new MethodNotImplementedError();
  }

  add(registration: IRegistration): this {
    throw new MethodNotImplementedError();
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
