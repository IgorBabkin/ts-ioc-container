import { type IProvider, ResolveOptions } from '../provider/IProvider';
import { type IRegistration } from '../registration/IRegistration';
import { IInjector, type WithArgs } from '../injector/IInjector';
import { type constructor, Instance } from '../utils/basic';
import { type ITypedEvent } from '../utils/TypedEvent';

/** A registration key: a string or a symbol. */
export type DependencyKey = string | symbol;
/** Narrows `target` to a {@link DependencyKey}. */
export function isDependencyKey(target: unknown): target is DependencyKey {
  return typeof target === 'symbol' || typeof target === 'string';
}

/** A scope label (`'application'`, `'request'`, ...) matched by `scope(...)` rules. */
export type Tag = string;
type WithTags = { tags: Tag[] };
type WithChild = { child: Tagged };
type WithExcludedKeys = { excludedKeys: DependencyKey[] };
/** Something carrying tags: a scope or a token. */
export interface Tagged {
  hasTag(tag: Tag): boolean;
  addTags(...tags: Tag[]): void;
}

/** Options of `resolve`: runtime `args`, `lazy`, and the invoking `child` scope. */
export type ResolveOneOptions = ResolveOptions & Partial<WithChild>;
/** Options of `resolveByAlias`: like {@link ResolveOneOptions}, plus keys to exclude. */
export type ResolveManyOptions = ResolveOneOptions & Partial<WithExcludedKeys>;
/** Something that resolves a key or a class. */
export interface Resolvable {
  resolve<T>(key: constructor<T> | DependencyKey, options?: ResolveOneOptions): T;
}

/**
 * A reusable bundle of registrations or event subscriptions applied with
 * `container.useModule(module)`. A plain object with `applyTo` is enough.
 *
 * @example
 * const loggingModule: IContainerModule = {
 *   applyTo: (container) => container.addRegistration(Registration.fromClass(Logger)),
 * };
 */
export interface IContainerModule {
  applyTo(container: IContainer): void;
}
/** Options of `createScope`: the child scope's `tags`. */
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

/** A dependency injection scope. See {@link Container}. */
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

  /** Low-level: puts `value` under `key` in this scope only. Prefer `addRegistration`. */
  register(key: DependencyKey, value: IProvider, options?: RegisterOptions): this;

  /** Registers here if the registration's scope rules match, and remembers it for future child scopes. */
  addRegistration(registration: IRegistration): this;

  /** Registrations added to this scope and its parents - what `createScope` copies. */
  getRegistrations(): IRegistration[];

  /** Whether a provider is registered under `key` in this scope (parents are not checked). */
  hasRegistration(key: DependencyKey): boolean;

  /**
   * Resolves a key, or constructs a class with the injector. Takes a key or a
   * class, not a token: for a token call `token.resolve(scope)`.
   *
   * @example
   * scope.resolve<ILogger>('ILogger');
   * scope.resolve(App, { args: ['tenant-1'] });
   */
  resolve<T>(target: constructor<T> | DependencyKey, options?: ResolveOneOptions): T;

  /** Resolves every accessible dependency registered under `alias`, in this scope and its parents. */
  resolveByAlias<T>(alias: DependencyKey, options?: ResolveManyOptions): T[];

  /** Resolves one dependency registered under `alias`, looking here first and then in parents. */
  resolveOneByAlias<T>(alias: DependencyKey, options?: ResolveOneOptions): T;

  /**
   * Creates a child scope and copies into it the registrations whose scope
   * rules match its tags. Registrations added later are not copied into it.
   *
   * @example
   * const request = app.createScope({ tags: ['request'] });
   */
  createScope(options?: CreateScopeOptions): IContainer;

  /** Resolves every provider marked with `autoResolve()`. */
  autoResolve(options?: AutoResolveOptions): this;

  /** Direct child scopes that are still alive. */
  getScopes(): IContainer[];

  /** Detaches a child scope; called by the child on dispose. */
  removeScope(child: IContainer): void;

  /** Applies a module to this scope. */
  useModule(module: IContainerModule): this;

  /** The parent scope, if any. */
  getParent(): IContainer | undefined;

  /** Instances constructed in this scope, and in child scopes when `cascade` is true. */
  getInstances(cascade?: boolean): Instance[];

  /** Whether this scope tracks `instance`. */
  hasInstance(instance: Instance): boolean;

  /** Raises `scopeDisposed`, drops providers and instances, and detaches from the parent. Child scopes are not disposed. */
  dispose(): void;

  /** Tracks an instance in this scope; called by the injector. */
  addInstance(instance: Instance): void;

  /** The injector shared by this scope tree, e.g. to subscribe to `onConstructed`. */
  getInjector(): IInjector;
}
