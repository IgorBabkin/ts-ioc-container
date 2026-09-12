import { type DependencyKey, type IContainer, type IContainerModule, isDependencyKey } from '../container/IContainer';
import type { ArgsFn, DecorateFn, GetCacheKey, IProvider, ProviderHook, ScopeAccessRule } from '../provider/IProvider';
import { SingleToken } from '../token/SingleToken';
import { BindToken } from '../token/BindToken';
import { MapFn } from '../utils/fp';
import { addClassMeta, getClassMeta } from '../metadata/class';
import { type constructor } from '../utils/basic';
import { type NamespaceTemplate } from '../utils/namespace';

export type ScopeMatchRule = (s: IContainer, prev: boolean) => boolean;

export interface ProviderPipe<T = unknown> {
  mapProvider(p: IProvider<T>): IProvider<T>;

  mapRegistration(r: IRegistration<T>): IRegistration<T>;
}

export const isProviderPipe = <T>(obj: unknown): obj is ProviderPipe<T> =>
  obj !== null && typeof obj === 'object' && 'mapProvider' in obj;

export const registerPipe = <T>(mapProvider: (p: IProvider<T>) => IProvider<T>): ProviderPipe<T> => ({
  mapProvider,
  mapRegistration: (r) => r.pipe(mapProvider),
});

/**
 * Anything that can name a binding key: a raw key, or a token that knows how to bind itself.
 */
export type Bindable<T = any> = DependencyKey | BindToken<T>;

export const toBindToken = <T>(target: Bindable<T>): BindToken<T> =>
  isDependencyKey(target) ? new SingleToken<T>(target) : target;

/**
 * Everything accepted at provider level - by `IRegistration.pipe(...)`.
 */
export type ProviderMapper<T = any> = MapFn<IProvider<T>> | ProviderPipe<T>;

export const toProviderFn = <T>(mapper: ProviderMapper<T>): MapFn<IProvider<T>> =>
  isProviderPipe<T>(mapper) ? mapper.mapProvider.bind(mapper) : mapper;

/**
 * Everything accepted at registration level - by `@register(...)`.
 */
export type RegistrationMapper<T = any> = MapFn<IRegistration<T>> | ProviderPipe<T> | Bindable<T>;

export const toRegistrationFn = <T>(mapper: RegistrationMapper<T>): MapFn<IRegistration<T>> => {
  if (typeof mapper === 'function') return mapper;
  if (isProviderPipe<T>(mapper)) return (r) => mapper.mapRegistration(r);
  return bindTo(mapper);
};

export interface IRegistration<T = any> extends IContainerModule {
  getKeyOrFail(): DependencyKey;

  when(...predicates: ScopeMatchRule[]): this;

  bindToKey(key: DependencyKey): this;

  bindTo(key: Bindable): this;

  pipe(...mappers: ProviderMapper<T>[]): this;

  bindToAlias(alias: DependencyKey): this;
}

export type ReturnTypeOfRegistration<T> = T extends IRegistration<infer R> ? R : never;

const METADATA_KEY = 'registration';
export const getTransformers = (Target: constructor<unknown>) =>
  getClassMeta<MapFn<IRegistration>[]>(Target, METADATA_KEY) ?? [];

export const register = (...mappers: RegistrationMapper[]) =>
  addClassMeta(METADATA_KEY, (acc: MapFn<IRegistration>[] | undefined) => {
    const result = mappers.map((m) => toRegistrationFn(m));
    return acc ? [...result, ...acc] : result;
  });

export const bindTo =
  (...tokens: Bindable[]): MapFn<IRegistration> =>
  (r) => {
    for (const token of tokens) {
      toBindToken(token).bindTo(r);
    }
    return r;
  };

export const scope =
  (...rules: ScopeMatchRule[]): MapFn<IRegistration> =>
  (r) =>
    r.when(...rules);

export const appendArgs = <T>(...extraArgs: unknown[]) =>
  registerPipe<T>((p) => p.addArgsFn((_, { args = [] } = {}) => [...args, ...extraArgs]));

export const appendArgsFn = <T>(fn: ArgsFn) =>
  registerPipe<T>((p) => p.addArgsFn((scope, options) => [...(options?.args ?? []), ...fn(scope, options)]));

export const scopeAccess = <T>(rule: ScopeAccessRule) => registerPipe<T>((p) => p.addAccessRule(rule));

/**
 * Restricts a provider to the modules a namespace template covers, so only
 * classes under `/domain/**` see the dependency registered for them.
 *
 * Several templates act as alternatives - a provider reachable from either of
 * two module trees lists both.
 */
export const namespace = <T>(...templates: NamespaceTemplate[]) =>
  registerPipe<T>((p) => templates.reduce((provider, template) => provider.addNamespaceTemplate(template), p));

export const lazy = <T>() => registerPipe<T>((p) => p.lazy());

export const autoResolve = <T>() => registerPipe<T>((p) => p.autoResolve());

export const decorate = (...fns: DecorateFn[]) => registerPipe((p) => p.map(...fns));

export const singleton = <T = unknown>(getCacheKey?: GetCacheKey) => registerPipe<T>((p) => p.singleton(getCacheKey));

/**
 * Registration-level form of `IProvider.onResolved`: attaches provider hooks to
 * the piped registration's provider.
 */
export const onResolve = <T = unknown>(...hooks: ProviderHook[]) => registerPipe<T>((p) => p.onResolved(...hooks));
