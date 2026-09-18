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
export type ResolveDependency<T = unknown> = (options: ProviderOptions) => T;
export type ScopeAccessOptions = { invocationScope: Tagged; providerScope: Tagged; args: unknown[] };
export type ScopeAccessRule = (options: ScopeAccessOptions, prev: boolean) => boolean;

export type ArgsFn = (options: InjectOptions) => unknown[];

export type GetCacheKey = (args: unknown[]) => string | Serializable;
export type DecorateFn<Instance = any> = (dep: Instance, scope: IContainer) => Instance;

/**
 * Provider hooks - the provider's own domain: a dependency was resolved.
 *
 * Resolution is the provider's business, so the hook list belongs to the
 * provider. A dependency is not necessarily a constructed instance - a provider
 * can hand out a value the container never built - so the hook takes `unknown`.
 */
export type ProviderHook = (dependency: unknown, scope: IContainer) => void;

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
