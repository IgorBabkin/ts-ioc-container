import { IContainer, Tagged } from '../container/IContainer';
import { InjectOptions } from '../injector/IInjector';

export type WithLazy = { lazy: boolean };
export type ProviderOptions = InjectOptions & Partial<WithLazy>;
export type ResolveDependency<T = unknown> = (container: IContainer, options: ProviderOptions) => T;
export type ScopeAccessOptions = { invocationScope: Tagged; providerScope: Tagged; args: unknown[] };
export type ScopeAccessRule = (options: ScopeAccessOptions, prev: boolean) => boolean;

export type ArgsFn = (l: IContainer, options?: InjectOptions) => unknown[];

export type GetCacheKey = (...args: unknown[]) => string | symbol;
export type DecorateFn<Instance = any> = (dep: Instance, scope: IContainer) => Instance;

export interface IProvider<T = any> {
  resolve(container: IContainer, options: ProviderOptions): T;

  hasAccess(options: ScopeAccessOptions): boolean;

  map(...mappers: DecorateFn<T>[]): this;

  addAccessRule(...rules: ScopeAccessRule[]): this;

  addArgsFn(argsFn: ArgsFn): this;

  lazy(): this;

  singleton(getCacheKey?: GetCacheKey): this;
}
