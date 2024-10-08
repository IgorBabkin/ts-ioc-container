import { DependencyKey, IContainer, IContainerModule } from '../container/IContainer';
import { constructor, MapFn } from '../utils';
import { getMetadata, setMetadata } from '../metadata';
import { IProvider } from '../provider/IProvider';

export type ScopePredicate = (s: IContainer) => boolean;

export interface IRegistration<T = any> extends IContainerModule {
  when(isValidWhen: ScopePredicate): this;
  to(key: DependencyKey): this;
  pipe(...mappers: MapFn<IProvider<T>>[]): this;
}

export type ReturnTypeOfRegistration<T> = T extends IRegistration<infer R> ? R : never;

export const key =
  (key: DependencyKey): MapFn<IRegistration> =>
  (r) =>
    r.to(key);

export const scope =
  (predicate: ScopePredicate): MapFn<IRegistration> =>
  (r) =>
    r.when(predicate);

const METADATA_KEY = 'registration';
export const getTransformers = (Target: constructor<unknown>) =>
  getMetadata<MapFn<IRegistration>[]>(Target, METADATA_KEY) ?? [];

export const register = (...mappers: MapFn<IRegistration>[]) => setMetadata(METADATA_KEY, mappers);
