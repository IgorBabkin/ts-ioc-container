import { Alias, DependencyKey, IContainerModule, Tagged } from '../container/IContainer';
import { constructor, MapFn } from '../utils';
import { getMetadata, setMetadata } from '../metadata';

export type ScopePredicate = (c: Tagged) => boolean;

export interface IRegistration extends IContainerModule {
  addAliases(...aliases: Alias[]): this;
  setScopePredicate(isValidWhen: ScopePredicate): this;
  to(key: DependencyKey): this;
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
    r.setScopePredicate(predicate);

const METADATA_KEY = 'registration';
export const getTransformers = (Target: constructor<unknown>) =>
  getMetadata<MapFn<IRegistration>[]>(Target, METADATA_KEY) ?? [];

export const register = (...mappers: MapFn<IRegistration>[]) => setMetadata(METADATA_KEY, mappers);
