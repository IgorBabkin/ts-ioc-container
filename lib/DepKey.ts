import { DependencyKey, IContainer } from './container/IContainer';
import { MapFn } from './utils';
import { IRegistration, ScopePredicate } from './registration/IRegistration';
import { IProvider } from './provider/IProvider';
import { Registration } from './registration/Registration';
import { Provider } from './provider/Provider';
import { by } from './by';

export type DepKey<T> = {
  key: DependencyKey;
  assignTo: (registration: IRegistration<T>) => IRegistration<T>;
  register: (fn: (s: IContainer, ...args: unknown[]) => T) => IRegistration<T>;
  resolve: (s: IContainer) => T;
  pipe(...values: MapFn<IProvider<T>>[]): DepKey<T>;
  to(target: DependencyKey): DepKey<T>;
  when(value: ScopePredicate): DepKey<T>;
  redirectFrom: (registration: IRegistration<T>) => IRegistration<T>;
};

export const isDepKey = <T>(key: unknown): key is DepKey<T> => {
  return typeof key === 'object' && key !== null && 'key' in key;
};

export const depKey = <T>(key: DependencyKey): DepKey<T> => {
  let isValidWhen: ScopePredicate;
  const mappers: MapFn<IProvider<T>>[] = [];

  return {
    key,

    assignTo: (registration: IRegistration<T>) => {
      let reg: IRegistration<T> = registration.pipe(...mappers).fromKey(key);
      if (isValidWhen) {
        reg = registration.when(isValidWhen);
      }
      return reg;
    },

    register: (fn: (s: IContainer, ...args: unknown[]) => T): IRegistration<T> => {
      let registration: IRegistration<T> = new Registration(() => new Provider<T>(fn), key).pipe(...mappers);
      if (isValidWhen) {
        registration = registration.when(isValidWhen);
      }
      return registration;
    },

    resolve: by.key<T>(key),

    pipe(...values: MapFn<IProvider<T>>[]) {
      mappers.push(...values);
      return this;
    },

    to(target: DependencyKey) {
      key = target;
      return this;
    },

    when(value: ScopePredicate) {
      isValidWhen = value;
      return this;
    },

    redirectFrom: (registration) => registration.redirectFrom(key),
  };
};
