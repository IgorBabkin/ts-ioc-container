import type { DependencyKey, IContainer, IContainerModule } from '../container/IContainer';
import type { IProvider } from '../provider/IProvider';
import { isProviderPipe, ProviderPipe } from '../provider/ProviderPipe';
import { SingleToken } from '../token/SingleToken';
import { BindToken, isBindToken } from '../token/BindToken';
import { MapFn } from '../utils/fp';
import { getClassMetadata, setClassMetadata } from '../metadata/class';
import { type constructor } from '../utils/basic';

export type ScopeMatchRule = (s: IContainer, prev?: boolean) => boolean;

export interface IRegistration<T = any> extends IContainerModule {
  when(...predicates: ScopeMatchRule[]): this;

  bindToKey(key: DependencyKey): this;

  bindTo(key: DependencyKey | BindToken): this;

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderPipe<T>)[]): this;

  bindToAlias(alias: DependencyKey): this;
}

export type ReturnTypeOfRegistration<T> = T extends IRegistration<infer R> ? R : never;

export const scope =
  (...rules: ScopeMatchRule[]): MapFn<IRegistration> =>
  (r) =>
    r.when(...rules);

const METADATA_KEY = 'registration';
export const getTransformers = (Target: constructor<unknown>) =>
  getClassMetadata<MapFn<IRegistration>[]>(Target, METADATA_KEY) ?? [];

export const register = (...mappers: Array<MapFn<IRegistration> | ProviderPipe>) =>
  setClassMetadata(METADATA_KEY, (acc: MapFn<IRegistration>[] | undefined) => {
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
