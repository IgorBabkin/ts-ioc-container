import { type IProvider, ProviderOptions } from '../provider/IProvider';
import { type IRegistration } from '../registration/IRegistration';
import { IInjector, type WithArgs } from '../injector/IInjector';
import { type constructor, Instance } from '../utils/basic';
import { type ITypedEvent } from '../utils/TypedEvent';

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

/**
 * Scope event hooks - the container's own domain: a scope was created, a scope
 * was disposed. The listener type of `IContainer.scopeCreated` / `scopeDisposed`.
 *
 * The other two hook domains live with the abstraction which raises them:
 * injector hooks on `IInjector` (`InjectorHook`), provider hooks on
 * {@link IProvider} (`ProviderHook`). An injector is configured before it is
 * passed to a container's constructor, so a container never hands its injector
 * out.
 */
export type ScopeHook = (scope: IContainer) => void;

/**
 * Scope event hook for a registration landing in a scope: a provider entered
 * the provider map under `key`. Registration is always of a provider, so the
 * name says only what varies. The listener type of `IContainer.registered`.
 */
export type RegisteredHook = (provider: IProvider, key: DependencyKey, scope: IContainer) => void;

export interface IContainer extends Tagged {
  readonly isDisposed: boolean;

  /**
   * Raised once a scope this container created is fully registered and attached.
   * The subscriber's side only - a container raises its own scope events.
   */
  readonly scopeCreated: ITypedEvent<[IContainer]>;

  /**
   * Raised by this container as it disposes, before its providers and instances go.
   */
  readonly scopeDisposed: ITypedEvent<[IContainer]>;

  /**
   * Raised once a provider is registered here under a resolvable key.
   */
  readonly registered: ITypedEvent<[IProvider, DependencyKey, IContainer]>;

  register(key: DependencyKey, value: IProvider, options?: RegisterOptions): this;

  addRegistration(registration: IRegistration): this;

  getRegistrations(): IRegistration[];

  hasRegistration(key: DependencyKey): boolean;

  resolve<T>(target: constructor<T> | DependencyKey, options?: ResolveOneOptions): T;

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

  getInjector(): IInjector;
}
