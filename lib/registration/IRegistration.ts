import type { DependencyKey, IContainer, IContainerModule } from '../container/IContainer';
import { constructor, Is, MapFn } from '../utils';
import { getMetadata, setMetadata } from '../metadata';
import type { IProvider } from '../provider/IProvider';
import type { DepKey } from '../DepKey';
import { isProviderPipe, ProviderPipe } from '../provider/ProviderPipe';

export type ScopePredicate = (s: IContainer, prev?: boolean) => boolean;

export interface IRegistration<T = any> extends IContainerModule {
  when(...predicates: ScopePredicate[]): this;

  bindToKey(key: DependencyKey): this;

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderPipe<T>)[]): this;

  bindToAlias(alias: DependencyKey): this;
}

export type ReturnTypeOfRegistration<T> = T extends IRegistration<infer R> ? R : never;

export const scope =
  (...predicates: ScopePredicate[]): MapFn<IRegistration> =>
  (r) =>
    r.when(...predicates);

const METADATA_KEY = 'registration';
export const getTransformers = (Target: constructor<unknown>) =>
  getMetadata<MapFn<IRegistration>[]>(Target, METADATA_KEY) ?? [];

export const register = (...mappers: Array<MapFn<IRegistration> | ProviderPipe>) =>
  setMetadata(
    METADATA_KEY,
    mappers.map((m) => (isProviderPipe(m) ? (r: IRegistration) => m.mapRegistration(r) : m)),
  );

export const asAlias =
  (target: DependencyKey | DepKey<any>): MapFn<IRegistration> =>
  (r) =>
    r.bindToAlias(Is.dependencyKey(target) ? target : target.key);

export const asKey =
  (key: DependencyKey): MapFn<IRegistration> =>
  (r) =>
    r.bindToKey(key);
