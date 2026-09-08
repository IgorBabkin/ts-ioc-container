import { type IProvider, ProviderOptions } from '../provider/IProvider';
import { type IRegistration } from '../registration/IRegistration';
import { OnDisposeHook } from '../hooks/onContainerDisposed';
import { type WithArgs } from '../injector/IInjector';
import { type constructor, Instance } from '../utils/basic';

export type DependencyKey = string | symbol;
export function isDependencyKey(target: unknown): target is DependencyKey {
  return typeof target === 'symbol' || typeof target === 'string';
}

export type Tag = string;
type WithTags = { tags: Tag[] };
type WithChild = { child: Tagged };
type WithExcludedKeys = { excludedKeys: DependencyKey[] };
export interface Tagged {
  hasTag(tag: Tag): boolean;
  addTags(...tags: Tag[]): void;
}

export type ResolveOneOptions = ProviderOptions & Partial<WithChild>;
export type ResolveManyOptions = ResolveOneOptions & Partial<WithExcludedKeys>;
export interface Resolvable {
  resolve<T>(key: constructor<T> | DependencyKey, options?: ResolveOneOptions): T;
}

export interface IContainerModule {
  applyTo(container: IContainer): void;
}
export type CreateScopeOptions = Partial<WithTags>;
export type AutoResolveOptions = Partial<WithArgs>;
export type RegisterOptions = { aliases?: DependencyKey[] };

export type ScopeHook = (scope: IContainer) => void;
export type DependencyHook = (dependency: unknown, scope: IContainer) => void;
export type ProviderHook = (provider: IProvider, scope: IContainer) => void;

export interface IContainer extends Tagged {
  readonly isDisposed: boolean;

  onInstanceDisposed(...hooks: OnDisposeHook[]): this;

  onScopeCreated(...hooks: ScopeHook[]): this;

  onProviderRegistered(...hooks: ProviderHook[]): this;

  register(key: DependencyKey, value: IProvider, options?: RegisterOptions): this;

  addRegistration(registration: IRegistration): this;

  getRegistrations(): IRegistration[];

  hasRegistration(key: DependencyKey): boolean;

  resolve<T>(target: constructor<T> | DependencyKey, options?: ResolveOneOptions): T;

  /**
   * Builds `Target` through this scope's injector, bypassing the provider map.
   *
   * This is the raw construction step `resolve` ends in, exposed so a provider
   * can create instances of a class without recursing back into `resolve`.
   */
  construct<T>(Target: constructor<T>, options?: ProviderOptions): T;

  resolveByAlias<T>(alias: DependencyKey, options?: ResolveManyOptions): T[];

  resolveOneByAlias<T>(alias: DependencyKey, options?: ResolveOneOptions): T;

  createScope(options?: CreateScopeOptions): IContainer;

  autoResolve(options?: AutoResolveOptions): this;

  getScopes(): IContainer[];

  removeScope(child: IContainer): void;

  useModule(module: IContainerModule): this;

  getParent(): IContainer | undefined;

  getInstances(cascade?: boolean): Instance[];

  hasInstance(instance: Instance): boolean;

  dispose(): void;

  addInstance(instance: Instance): void;
}
