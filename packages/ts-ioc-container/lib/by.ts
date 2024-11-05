import { CreateScopeOptions, DependencyKey, IContainer, InjectionToken } from './container/IContainer';
import { IProvider, ProviderResolveOptions } from './provider/IProvider';

import { InjectFn } from './hooks/HookContext';
import { IRegistration, ScopePredicate } from './registration/IRegistration';
import { Registration } from './registration/Registration';
import { Provider } from './provider/Provider';
import { generateUUID, MapFn } from './utils';

export type InstancePredicate = (dep: unknown) => boolean;
export const all: InstancePredicate = () => true;

export type IMemo = Map<string, DependencyKey[]>;
export const IMemoKey = Symbol('IMemo');

type AliasOptions = {
  memoize?: (c: IContainer) => string;
  lazy?: boolean;
};

type AliasPredicate = (aliases: Set<string>, container: IContainer) => boolean;

export const byAliases =
  (predicate: AliasPredicate, { memoize, lazy }: AliasOptions = {}): InjectFn<unknown[]> =>
  (c: IContainer) => {
    const predicateFn = (aliases: Set<string>) => predicate(aliases, c);
    const memoKey = memoize?.(c);

    if (memoKey === undefined) {
      return Array.from(c.resolveManyByAlias(predicateFn, { lazy }).values());
    }

    const memo = c.resolve<IMemo>(IMemoKey);
    const memoized = memo.get(memoKey);
    if (memoized) {
      return memoized.map((key) => c.resolve(key, { lazy }));
    }
    const result = c.resolveManyByAlias(predicateFn, { lazy });
    memo.set(memoKey, Array.from(result.keys()));
    return Array.from(result.values());
  };

export const byAlias =
  (predicate: AliasPredicate, { memoize, lazy }: AliasOptions = {}): InjectFn =>
  (c: IContainer) => {
    const predicateFn = (aliases: Set<string>) => predicate(aliases, c);
    const memoKey = memoize?.(c);
    if (memoKey === undefined) {
      return c.resolveOneByAlias(predicateFn, { lazy })[1];
    }

    const memo = c.resolve<IMemo>(IMemoKey);
    const memoized = memo.get(memoKey);
    if (memoized) {
      return c.resolve(memoized[0], { lazy });
    }
    const [key, result] = c.resolveOneByAlias(predicateFn, { lazy });
    memo.set(memoKey, [key]);
    return result;
  };

export const by = {
  keys:
    (keys: InjectionToken[], { lazy }: Pick<ProviderResolveOptions, 'lazy'> = {}) =>
    (с: IContainer, ...args: unknown[]) =>
      keys.map((t) => с.resolve(t, { args, lazy })),

  key:
    <T>(key: InjectionToken<T>, { args: deps = [], lazy }: { args?: unknown[]; lazy?: boolean } = {}) =>
    (c: IContainer, ...args: unknown[]) =>
      c.resolve<T>(key, { args: [...deps, ...args], lazy }),

  instances:
    (predicate: InstancePredicate = all) =>
    (l: IContainer) =>
      l.getInstances().filter(predicate),

  scope: {
    current: (container: IContainer) => container,

    create: (options: CreateScopeOptions) => (l: IContainer) => l.createScope(options),
  },
};

export type DepKey<T> = {
  key: DependencyKey;
  assignTo: (registration: IRegistration<T>) => IRegistration<T>;
  register: (fn: (s: IContainer, ...args: unknown[]) => T) => IRegistration<T>;
  resolve: (s: IContainer, ...args: unknown[]) => T;
  pipe(...values: MapFn<IProvider<T>>[]): DepKey<T>;
  to(target: DependencyKey): DepKey<T>;
  when(value: ScopePredicate): DepKey<T>;
  redirectFrom: (registration: IRegistration<T>) => IRegistration<T>;
};

export const depKey = <T>(key: DependencyKey = generateUUID()): DepKey<T> => {
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

    resolve: (s: IContainer, ...args: unknown[]) => by.key<T>(key)(s, ...args),

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
