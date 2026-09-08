import {
  type AutoResolveOptions,
  type DependencyKey,
  type IContainer,
  type IContainerModule,
  type ScopeHook,
  type RegisteredHook,
  type ResolveManyOptions,
  type ResolveOneOptions,
  type Tag,
} from './IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';
import { type IProvider } from '../provider/IProvider';
import { type IRegistration } from '../registration/IRegistration';
import { type constructor, type Instance } from '../utils/basic';

export class EmptyContainer implements IContainer {
  /**
   * @throws {MethodNotImplementedError} always — the empty container has no disposal state.
   */
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

  hasInstance(instance: Instance): boolean {
    return false;
  }

  /**
   * @throws {MethodNotImplementedError} always — the empty container cannot create scopes.
   */
  createScope(): IContainer {
    throw new MethodNotImplementedError();
  }

  /**
   * @throws {MethodNotImplementedError} always — the empty container holds no providers to resolve.
   */
  autoResolve(options?: AutoResolveOptions): this {
    throw new MethodNotImplementedError();
  }

  /**
   * @throws {MethodNotImplementedError} always — the empty container cannot be disposed.
   */
  dispose(): void {
    throw new MethodNotImplementedError();
  }

  /**
   * @throws {MethodNotImplementedError} always — the empty container cannot hold registrations.
   */
  register(key: DependencyKey, value: IProvider): this {
    throw new MethodNotImplementedError();
  }

  /**
   * @throws {MethodNotImplementedError} always — the empty container has no tags.
   */
  hasTag(tag: Tag): boolean {
    throw new MethodNotImplementedError();
  }

  /**
   * @throws {MethodNotImplementedError} always — the empty container has no tags.
   */
  addTags(...tags: Tag[]): void {
    throw new MethodNotImplementedError();
  }

  getRegistrations() {
    return [];
  }

  hasRegistration(key: DependencyKey): boolean {
    return false;
  }

  removeScope(): void {}

  /**
   * @throws {MethodNotImplementedError} always — the empty container cannot use modules.
   */
  useModule(module: IContainerModule): this {
    throw new MethodNotImplementedError();
  }

  /**
   * @throws {MethodNotImplementedError} always — the empty container cannot hold registrations.
   */
  addRegistration(registration: IRegistration): this {
    throw new MethodNotImplementedError();
  }

  /**
   * @throws {DependencyNotFoundError} always — reaching the empty container means `key` was not found in any scope.
   */
  resolve<T>(key: constructor<T> | DependencyKey, options?: ResolveOneOptions): T {
    throw new DependencyNotFoundError(`Cannot find ${key.toString()}`);
  }

  resolveByAlias<T>(alias: DependencyKey, options?: ResolveManyOptions): T[] {
    return [];
  }

  /**
   * @throws {DependencyNotFoundError} always — reaching the empty container means `alias` was not found in any scope.
   */
  resolveOneByAlias<T>(alias: DependencyKey, options?: ResolveOneOptions): T {
    throw new DependencyNotFoundError(`Cannot find alias ${alias.toString()}`);
  }

  /**
   * @throws {MethodNotImplementedError} always — the empty container cannot hold hooks.
   */
  onScopeCreated(...hooks: ScopeHook[]): this {
    throw new MethodNotImplementedError();
  }

  /**
   * @throws {MethodNotImplementedError} always — the empty container cannot hold hooks.
   */
  onScopeDisposed(...hooks: ScopeHook[]): this {
    throw new MethodNotImplementedError();
  }

  /**
   * @throws {MethodNotImplementedError} always — the empty container cannot hold hooks.
   */
  onRegistered(...hooks: RegisteredHook[]): this {
    throw new MethodNotImplementedError();
  }
}
