import { Alias, DependencyKey, IContainerModule, Tagged } from '../container/IContainer';
import { constructor, MapFn } from '../utils';
import { getMetadata, setMetadata } from '../metadata';
import { IProvider } from '../provider/IProvider';

export type ScopePredicate = (c: Tagged) => boolean;

export interface IRegistration<T = unknown> extends IContainerModule {
  addAliases(...aliases: Alias[]): this;
  when(isValidWhen: ScopePredicate): this;
  to(key: DependencyKey): this;
  pipe(...mappers: MapFn<IRegistration<T>>[]): IRegistration<T>;
  provider(...mappers: MapFn<IProvider<T>>[]): this;
}

export const key =
  (key: DependencyKey): MapFn<IRegistration> =>
  (r) =>
    r.to(key);

export const alias =
  (...aliases: Alias[]): MapFn<IRegistration> =>
  (r) =>
    r.addAliases(...aliases);

export const scope =
  (predicate: ScopePredicate): MapFn<IRegistration> =>
  (r) =>
    r.when(predicate);

const METADATA_KEY = 'registration';
export const getTransformers = (Target: constructor<unknown>) =>
  getMetadata<MapFn<IRegistration>[]>(Target, METADATA_KEY) ?? [];

export const register = (...mappers: MapFn<IRegistration>[]) => setMetadata(METADATA_KEY, mappers);

export const provider =
  (...mappers: MapFn<IProvider>[]): MapFn<IRegistration> =>
  (r) =>
    r.provider(...mappers);
