import { IContainer, Tagged } from '../container/IContainer';
import { registerPipe } from './ProviderPipe';
import { InjectOptions } from '../injector/IInjector';

export type WithLazy = { lazy: boolean };
export type ProviderOptions = InjectOptions & Partial<WithLazy>;
export type ResolveDependency<T = unknown> = (container: IContainer, options: ProviderOptions) => T;
export type ScopeAccessOptions = { invocationScope: Tagged; providerScope: Tagged; args: unknown[] };
export type ScopeAccessRule = (options: ScopeAccessOptions, prev: boolean) => boolean;

export type ArgsFn = (l: IContainer, options?: InjectOptions) => unknown[];
export interface IMapper {
  mapItem<T>(target: IProvider<T>): IProvider<T>;
}

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

export const appendArgs = <T>(...extraArgs: unknown[]) =>
  registerPipe<T>((p) => p.addArgsFn((_, { args = [] } = {}) => [...args, ...extraArgs]));

export const appendArgsFn = <T>(fn: ArgsFn) =>
  registerPipe<T>((p) => p.addArgsFn((scope, options) => [...(options?.args ?? []), ...fn(scope, options)]));

export const scopeAccess = <T>(rule: ScopeAccessRule) => registerPipe<T>((p) => p.addAccessRule(rule));

export const lazy = <T>() => registerPipe<T>((p) => p.lazy());

export const decorate = (...fns: DecorateFn[]) => registerPipe((p) => p.map(...fns));

export const singleton = <T = unknown>(getCacheKey: GetCacheKey = () => '1') =>
  registerPipe<T>((p) => p.singleton(getCacheKey));
