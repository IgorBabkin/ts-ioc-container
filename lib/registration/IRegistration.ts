import { DependencyKey, IContainer, IContainerModule, isDependencyKey } from '../container/IContainer';
import { constructor, MapFn } from '../utils';
import { getMetadata, setMetadata } from '../metadata';
import { IProvider, ProviderMapper } from '../provider/IProvider';
import { DepKey, isDepKey } from '../DepKey';

export type ScopePredicate = (s: IContainer, prev?: boolean) => boolean;

export interface IRegistration<T = any> extends IContainerModule {
  when(...predicates: ScopePredicate[]): this;

  assignToKey(key: DependencyKey): this;

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderMapper)[]): this;

  assignToAliases(...aliases: DependencyKey[]): this;
}

export type ReturnTypeOfRegistration<T> = T extends IRegistration<infer R> ? R : never;

export const key =
  (...[originalKey, ...aliases]: DependencyKey[]): MapFn<IRegistration> =>
  (r) =>
    r.assignToKey(originalKey).assignToAliases(...aliases);

export const scope =
  (...predicates: ScopePredicate[]): MapFn<IRegistration> =>
  (r) =>
    r.when(...predicates);

const METADATA_KEY = 'registration';
export const getTransformers = (Target: constructor<unknown>) =>
  getMetadata<MapFn<IRegistration>[]>(Target, METADATA_KEY) ?? [];

export const register = (...mappers: Array<MapFn<IRegistration> | DepKey<any> | DependencyKey | ProviderMapper>) =>
  setMetadata(
    METADATA_KEY,
    mappers.map((m, index) =>
      m instanceof ProviderMapper
        ? (r: IRegistration) => r.pipe(m)
        : isDepKey(m)
          ? index === 0
            ? (r: IRegistration) => m.assignTo(r)
            : (r: IRegistration) => m.asAlias(r)
          : isDependencyKey(m)
            ? index === 0
              ? (r: IRegistration) => r.assignToKey(m)
              : (r: IRegistration) => r.assignToAliases(m)
            : m,
    ),
  );
export const alias =
  (...aliases: (DependencyKey | DepKey<any>)[]): MapFn<IRegistration> =>
  (r) =>
    r.assignToAliases(...aliases.map((a) => (isDependencyKey(a) ? a : a.key)));
