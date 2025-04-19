import { type DependencyKey, type IContainer } from './container/IContainer';
import { type MapFn } from './utils';
import { type IRegistration, type ScopePredicate } from './registration/IRegistration';
import { type IProvider } from './provider/IProvider';
import { Registration } from './registration/Registration';
import { Provider } from './provider/Provider';
import { type IInjectFnResolver } from './injector/IInjector';
import { type ProviderPipe } from './provider/ProviderPipe';

export type DepKey<T> = IInjectFnResolver<T> & {
  key: DependencyKey;
  asKey: (registration: IRegistration<T>) => IRegistration<T>;
  register: (fn: (s: IContainer, ...args: unknown[]) => T) => IRegistration<T>;
  pipe(...values: Array<MapFn<IProvider<T>> | ProviderPipe>): DepKey<T>;
  when(value: ScopePredicate): DepKey<T>;
  asAlias: (registration: IRegistration<T>) => IRegistration<T>;
};

export const depKey = <T>(key: DependencyKey): DepKey<T> => {
  const scopePredicates: ScopePredicate[] = [];
  const mappers: MapFn<IProvider<T>>[] = [];

  return {
    key,

    asKey: (registration: IRegistration<T>) => {
      let reg: IRegistration<T> = registration.pipe(...mappers).bindToKey(key);
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

    resolve: (s: IContainer, options): T => s.resolveOne(key, options),

    pipe(...values: MapFn<IProvider<T>>[]) {
      mappers.push(...values);
      return this;
    },

    when(...predicates: ScopePredicate[]) {
      scopePredicates.push(...predicates);
      return this;
    },

    asAlias(r) {
      return r.bindToAlias(key);
    },
  };
};
