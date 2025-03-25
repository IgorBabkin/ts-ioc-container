import { DependencyKey, IContainer } from './container/IContainer';
import { MapFn } from './utils';
import { IRegistration, ScopePredicate } from './registration/IRegistration';
import { IProvider } from './provider/IProvider';
import { Registration } from './registration/Registration';
import { Provider } from './provider/Provider';
import { IInjectFnResolver } from './injector/IInjector';
import { ProviderMapper } from './provider/ProviderMapper';

export type DepKey<T> = IInjectFnResolver<T> & {
  key: DependencyKey;
  assignTo: (registration: IRegistration<T>) => IRegistration<T>;
  register: (fn: (s: IContainer, ...args: unknown[]) => T) => IRegistration<T>;
  pipe(...values: Array<MapFn<IProvider<T>> | ProviderMapper>): DepKey<T>;
  to(target: DependencyKey): DepKey<T>;
  when(value: ScopePredicate): DepKey<T>;
  asAlias: (registration: IRegistration<T>) => IRegistration<T>;
};

export const isDepKey = <T>(key: unknown): key is DepKey<T> => {
  return typeof key === 'object' && key !== null && 'key' in key;
};

export const depKey = <T>(key: DependencyKey): DepKey<T> => {
  const scopePredicates: ScopePredicate[] = [];
  const mappers: MapFn<IProvider<T>>[] = [];

  return {
    key,

    assignTo: (registration: IRegistration<T>) => {
      let reg: IRegistration<T> = registration.pipe(...mappers).assignToKey(key);
      if (scopePredicates.length > 0) {
        reg = registration.when(...scopePredicates);
      }
      return reg;
    },

    register: (fn: (s: IContainer, ...args: unknown[]) => T): IRegistration<T> => {
      let registration: IRegistration<T> = new Registration(() => new Provider<T>(fn), key).pipe(...mappers);
      if (scopePredicates.length > 0) {
        registration = registration.when(...scopePredicates);
      }
      return registration;
    },

    resolve: (s: IContainer): T => s.resolve(key),

    pipe(...values: MapFn<IProvider<T>>[]) {
      mappers.push(...values);
      return this;
    },

    to(target: DependencyKey) {
      key = target;
      return this;
    },

    when(...predicates: ScopePredicate[]) {
      scopePredicates.push(...predicates);
      return this;
    },

    asAlias(r) {
      r.assignToAliases(key);
      return r;
    },
  };
};
