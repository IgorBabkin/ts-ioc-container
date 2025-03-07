import { DependencyKey, IContainer, IContainerModule, isDependencyKey } from '../container/IContainer';
import { constructor, MapFn } from '../utils';
import { getMetadata, setMetadata } from '../metadata';
import { IProvider } from '../provider/IProvider';
import { DepKey, isDepKey } from '../by';

export type ScopePredicate = (s: IContainer, prev?: boolean) => boolean;

export interface IRegistration<T = any> extends IContainerModule {
  when(...predicates: ScopePredicate[]): this;

  fromKey(key: DependencyKey): this;

  pipe(...mappers: MapFn<IProvider<T>>[]): this;

  redirectFrom(...keys: DependencyKey[]): this;
}

export type ReturnTypeOfRegistration<T> = T extends IRegistration<infer R> ? R : never;

export const key =
  (...keys: DependencyKey[]): MapFn<IRegistration> =>
  (r) => {
    const [originalKey, ...redirectKeys] = keys;
    return r.fromKey(originalKey).redirectFrom(...redirectKeys);
  };

export const redirectFrom =
  (...keys: DependencyKey[]): MapFn<IRegistration> =>
  (r) =>
    r.redirectFrom(...keys);

export const scope =
  (...predicates: ScopePredicate[]): MapFn<IRegistration> =>
  (r) =>
    r.when(...predicates);

const METADATA_KEY = 'registration';
export const getRegistrationTransformers = (Target: constructor<unknown>) =>
  getMetadata<MapFn<IRegistration>[]>(Target, METADATA_KEY) ?? [];

export const register = (...mappers: (MapFn<IRegistration> | DepKey<any> | DependencyKey)[]) =>
  setMetadata(
    METADATA_KEY,
    mappers.map((m, index) => {
      if (isDepKey(m)) {
        return index === 0 ? m.assignTo.bind(m) : m.redirectFrom.bind(m);
      }

      if (isDependencyKey(m)) {
        return (r: IRegistration) => (index === 0 ? r.fromKey(m) : r.redirectFrom(m));
      }

      return m;
    }),
  );
