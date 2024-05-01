import { DependencyKey, IContainer, InjectionToken } from './container/IContainer';
import { ProviderResolveOptions } from './provider/IProvider';

export type InstancePredicate = (dep: unknown) => boolean;
export const all: InstancePredicate = () => true;

export type IMemo = Map<string, DependencyKey[]>;
export const IMemoKey = Symbol('IMemo');

export const by = {
  aliases:
    (
      predicate: (it: Set<string>, s: IContainer) => boolean,
      { memoize, lazy }: { memoize?: (c: IContainer) => string; lazy?: boolean } = {},
    ) =>
    (c: IContainer, ...args: unknown[]) => {
      const predicateFn = (aliases: Set<string>) => predicate(aliases, c);
      const memoKey = memoize?.(c);

      if (memoKey === undefined) {
        return Array.from(c.resolveManyByAlias(predicateFn, { args, lazy }).values());
      }

      const memo = c.resolve<IMemo>(IMemoKey);
      const memoized = memo.get(memoKey);
      if (memoized) {
        return memoized.map((key) => c.resolve(key, { args, lazy }));
      }
      const result = c.resolveManyByAlias(predicateFn, { args, lazy });
      memo.set(memoKey, Array.from(result.keys()));
      return Array.from(result.values());
    },

  /**
   * Get the instance that matches the given alias or fail
   * @param predicate
   * @param memoize
   */
  alias:
    (
      predicate: (it: Set<string>, s: IContainer) => boolean,
      { memoize, lazy }: { memoize?: (c: IContainer) => string; lazy?: boolean } = {},
    ) =>
    (c: IContainer, ...args: unknown[]) => {
      const predicateFn = (aliases: Set<string>) => predicate(aliases, c);
      const memoKey = memoize?.(c);
      if (memoKey === undefined) {
        return c.resolveOneByAlias(predicateFn, { args, lazy })[1];
      }

      const memo = c.resolve<IMemo>(IMemoKey);
      const memoized = memo.get(memoKey);
      if (memoized) {
        return c.resolve(memoized[0], { args, lazy });
      }
      const [key, result] = c.resolveOneByAlias(predicateFn, { args, lazy });
      memo.set(memoKey, [key]);
      return result;
    },

  /**
   * Get all instances that match the given keys
   * @param keys
   * @param lazy
   */
  keys:
    (keys: InjectionToken[], { lazy }: Pick<ProviderResolveOptions, 'lazy'> = {}) =>
    (с: IContainer, ...args: unknown[]) =>
      keys.map((t) => с.resolve(t, { args, lazy })),

  /**
   * Get the instance that matches the given key
   * @param key
   * @param deps
   * @param lazy
   */
  key:
    <T>(key: InjectionToken<T>, { args: deps = [], lazy }: { args?: unknown[]; lazy?: boolean } = {}) =>
    (c: IContainer, ...args: unknown[]) =>
      c.resolve<T>(key, { args: [...deps, ...args], lazy }),

  /**
   * Get all instances that match the given predicate
   * @param predicate
   */
  instances:
    (predicate: InstancePredicate = all) =>
    (l: IContainer) =>
      l.getInstances().filter(predicate),

  scope: {
    /**
     * Get the current scope
     */
    current: (container: IContainer) => container,

    /**
     * Create a new scope with the given tags
     * @param tags
     */
    create:
      (...tags: string[]) =>
      (l: IContainer) =>
        l.createScope(...tags),
  },
};
