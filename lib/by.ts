import { CreateScopeOptions, DependencyKey, IContainer, InjectionToken, Instance } from './container/IContainer';
import { ProviderResolveOptions } from './provider/IProvider';

import { InjectFn } from './hooks/HookContext';

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
      const [, result] = c.resolveOneByAlias(predicateFn, { lazy });
      return result;
    }

    const memo = c.resolve<IMemo>(IMemoKey);
    const memoized = memo.get(memoKey);
    if (memoized) {
      const [key] = memoized;
      return c.resolve(key, { lazy });
    }
    const [key, result] = c.resolveOneByAlias(predicateFn, { lazy });
    memo.set(memoKey, [key]);
    return result;
  };

export const by = {
  keys:
    (keys: InjectionToken[], { lazy }: Pick<ProviderResolveOptions, 'lazy'> = {}) =>
    (c: IContainer, ...args: unknown[]) =>
      keys.map((t) => c.resolve(t, { args, lazy })),

  key:
    <T>(key: InjectionToken<T>, { args: deps = [], lazy }: { args?: unknown[]; lazy?: boolean } = {}) =>
    (c: IContainer, ...args: unknown[]) =>
      c.resolve<T>(key, { args: [...deps, ...args], lazy }),

  instances:
    (predicate: InstancePredicate = all) =>
    (c: IContainer) => {
      const result = new Set<Instance>(c.getInstances());

      for (const scope of c.getScopes()) {
        for (const instance of scope.getInstances()) {
          result.add(instance);
        }
      }

      return Array.from(result).filter(predicate);
    },

  scope: {
    current: (container: IContainer) => container,

    create: (options: CreateScopeOptions) => (l: IContainer) => l.createScope(options),
  },
};
