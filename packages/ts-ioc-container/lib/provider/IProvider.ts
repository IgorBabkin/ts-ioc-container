import { IContainer, Tagged } from '../container/IContainer';
import { InjectOptions, WithScope } from '../injector/IInjector';
import { Serializable } from '../utils/basic';

export type WithLazy = { lazy: boolean };
/**
 * The resolution context a provider works in: the `scope` resolving, the runtime
 * `args`, and whether the caller asked for a `lazy` instance. One object, so a
 * function handed it destructures what it uses (`({ scope, args }) => ...`).
 */
export type ProviderOptions = InjectOptions & Partial<WithLazy>;
/**
 * `ProviderOptions` as a caller which addresses the scope directly passes them -
 * `scope.resolve(key, options)`, `token.resolve(scope, options)` - so the scope is
 * not repeated inside.
 */
export type ResolveOptions = Omit<ProviderOptions, keyof WithScope>;
/** A factory: builds the dependency from the resolution context. What `Registration.fromFn` takes. */
export type ResolveDependency<T = unknown> = (options: ProviderOptions) => T;
/** What a {@link ScopeAccessRule} sees: the scope asking, the scope holding the provider, and the runtime args. */
export type ScopeAccessOptions = { invocationScope: Tagged; providerScope: Tagged; args: unknown[] };
/** Decides whether a provider may be resolved for an invocation; `prev` is the result of earlier rules. Set with `scopeAccess(...)`. */
export type ScopeAccessRule = (options: ScopeAccessOptions, prev: boolean) => boolean;

/** Computes args from the resolution context. */
export type ArgsFn = (options: InjectOptions) => unknown[];

/** Maps runtime args to a `singleton(...)` cache key: one instance per distinct key. */
export type GetCacheKey = (args: unknown[]) => string | Serializable;
/** Wraps or replaces a resolved dependency. Used by `decorate(...)`. */
export type DecorateFn<Instance = any> = (dep: Instance, scope: IContainer) => Instance;

/**
 * Provider hooks - the provider's own domain: a dependency was resolved.
 *
 * Resolution is the provider's business, so the hook list belongs to the
 * provider. A dependency is not necessarily a constructed instance - a provider
 * can hand out a value the container never built - so the hook takes `unknown`.
 */
export type ProviderHook = (dependency: unknown, scope: IContainer) => void;

/** The factory behind a registration. See {@link Provider}. */
export interface IProvider<T = any> {
  resolve(options: ProviderOptions): T;

  hasAccess(options: ScopeAccessOptions): boolean;

  map(...mappers: DecorateFn<T>[]): this;

  addAccessRule(...rules: ScopeAccessRule[]): this;

  addArgsFn(argsFn: ArgsFn): this;

  lazy(): this;

  autoResolve(): this;

  isAutoResolvable(): boolean;

  singleton(getCacheKey?: GetCacheKey): this;

  dispose(): void;

  onResolved(...hooks: ProviderHook[]): this;
}
