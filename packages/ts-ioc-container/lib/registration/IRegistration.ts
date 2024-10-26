import { DependencyKey, IContainer, IContainerModule } from '../container/IContainer';
import { constructor, MapFn } from '../utils';
import { getMetadata, setMetadata } from '../metadata';
import { IProvider } from '../provider/IProvider';

export type ScopePredicate = (s: IContainer) => boolean;

export interface IRegistration<T = any> extends IContainerModule {
  when(isValidWhen: ScopePredicate): this;
  to(key: DependencyKey): this;
  pipe(...mappers: MapFn<IProvider<T>>[]): this;

  redirectFrom(key: DependencyKey): this;
}

export type ReturnTypeOfRegistration<T> = T extends IRegistration<infer R> ? R : never;

export const key =
  (...keys: DependencyKey[]): MapFn<IRegistration> =>
  (r) => {
    const [originalKey, ...redirectKeys] = keys;
    let registration: IRegistration = r.to(originalKey);
    for (const key of redirectKeys) {
      registration = registration.redirectFrom(key);
    }
    return registration;
  };

export const redirectFrom =
  (redirectKey: DependencyKey): MapFn<IRegistration> =>
  (r) => {
    return r.redirectFrom(redirectKey);
  };

export const scope =
  (predicate: ScopePredicate): MapFn<IRegistration> =>
  (r) =>
    r.when(predicate);

const METADATA_KEY = 'registration';
export const getTransformers = (Target: constructor<unknown>) =>
  getMetadata<MapFn<IRegistration>[]>(Target, METADATA_KEY) ?? [];

export const register = (...mappers: MapFn<IRegistration>[]) => setMetadata(METADATA_KEY, mappers);
