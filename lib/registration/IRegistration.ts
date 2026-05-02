import type { DependencyKey, IContainer, IContainerModule } from '../container/IContainer';
import type { ArgsFn, DecorateFn, GetCacheKey, IProvider, ScopeAccessRule } from '../provider/IProvider';
import { SingleToken } from '../token/SingleToken';
import { BindToken, isBindToken } from '../token/BindToken';
import { MapFn } from '../utils/fp';
import { classMeta, getClassMeta } from '../metadata/class';
import { type constructor } from '../utils/basic';

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

export interface IRegistration<T = any> extends IContainerModule {
  getKeyOrFail(): DependencyKey;

  when(...predicates: ScopeMatchRule[]): this;

  bindToKey(key: DependencyKey): this;

  bindTo(key: DependencyKey | BindToken): this;

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderPipe<T>)[]): this;

  bindToAlias(alias: DependencyKey): this;
}

export type ReturnTypeOfRegistration<T> = T extends IRegistration<infer R> ? R : never;

const METADATA_KEY = 'registration';
export const getTransformers = (Target: constructor<unknown>) =>
  getClassMeta<MapFn<IRegistration>[]>(Target, METADATA_KEY) ?? [];

export const register = (...mappers: Array<MapFn<IRegistration> | ProviderPipe>) =>
  classMeta(METADATA_KEY, (acc: MapFn<IRegistration>[] | undefined) => {
    const result = mappers.map((m) =>
      isProviderPipe(m) ? (r: IRegistration) => m.mapRegistration(r) : m,
    ) as MapFn<IRegistration>[];
    return acc ? [...result, ...acc] : result;
  });

export const bindTo =
  (...tokens: (DependencyKey | BindToken)[]): MapFn<IRegistration> =>
  (r) => {
    for (const token of tokens) {
      const targetToken = isBindToken(token) ? token : new SingleToken(token);
      targetToken.bindTo(r);
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

export const lazy = <T>() => registerPipe<T>((p) => p.lazy());

export const decorate = (...fns: DecorateFn[]) => registerPipe((p) => p.map(...fns));

export const singleton = <T = unknown>(getCacheKey?: GetCacheKey) => registerPipe<T>((p) => p.singleton(getCacheKey));
