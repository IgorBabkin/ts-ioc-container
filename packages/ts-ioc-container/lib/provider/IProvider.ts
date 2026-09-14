import { IContainer, Tagged } from '../container/IContainer';
import { InjectOptions } from '../injector/IInjector';
import { type Namespace, type NamespaceTemplate } from '../utils/namespace';

export type WithLazy = { lazy: boolean };

/**
 * The namespace name of the resolution's origin - `namespace + key` of the token
 * which asked for the dependency. It is absent when the caller did not name one,
 * which is what a namespace-restricted provider denies access to.
 */
export type WithNamespace = { namespace: Namespace };
export type ProviderOptions = InjectOptions & Partial<WithLazy> & Partial<WithNamespace>;
export type ResolveDependency<T = unknown> = (container: IContainer, options: ProviderOptions) => T;
export type ScopeAccessOptions = {
  invocationScope: Tagged;
  providerScope: Tagged;
  args: unknown[];
} & Partial<WithNamespace>;
export type ScopeAccessRule = (options: ScopeAccessOptions, prev: boolean) => boolean;

export type ArgsFn = (l: IContainer, options?: InjectOptions) => unknown[];

export type GetCacheKey = (...args: unknown[]) => string | symbol;
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
  resolve(container: IContainer, options: ProviderOptions): T;

  hasAccess(options: ScopeAccessOptions): boolean;

  map(...mappers: DecorateFn<T>[]): this;

  addAccessRule(...rules: ScopeAccessRule[]): this;

  addNamespaceTemplate(template: NamespaceTemplate): this;

  addArgsFn(argsFn: ArgsFn): this;

  lazy(): this;

  autoResolve(): this;

  isAutoResolvable(): boolean;

  singleton(getCacheKey?: GetCacheKey): this;

  dispose(): void;

  onResolved(...hooks: ProviderHook[]): this;
}
