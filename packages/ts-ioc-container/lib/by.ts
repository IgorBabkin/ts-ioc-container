import { DependencyKey, IContainer, InjectionToken } from './container/IContainer';

export type InstancePredicate = (dep: unknown) => boolean;
export const all: InstancePredicate = () => true;

export type IMemo = Map<string, DependencyKey[]>;
export const IMemoKey = Symbol('IMemo');

export const by = {
  aliases:
    (predicate: (it: Set<string>, s: IContainer) => boolean, memoize?: (c: IContainer) => string) =>
    (c: IContainer, ...args: unknown[]) => {
      const predicateFn = (aliases: Set<string>) => predicate(aliases, c);
      const memoKey = memoize?.(c);
      if (memoKey) {
        const memo = c.resolve<IMemo>(IMemoKey);
        const memoized = memo.get(memoKey);
        if (memoized) {
          return memoized.map((key) => c.resolve(key, { args }));
        }
        const result = c.resolveManyByAlias(predicateFn, { args });
        memo.set(memoKey, Array.from(result.keys()));
        return Array.from(result.values());
      }
      return Array.from(c.resolveManyByAlias(predicateFn, { args }).values());
    },

  /**
   * Get the instance that matches the given alias or fail
   * @param predicate
   * @param memoize
   */
  alias:
    (predicate: (it: Set<string>, s: IContainer) => boolean, memoize?: (c: IContainer) => string) =>
    (c: IContainer, ...args: unknown[]) => {
      const predicateFn = (aliases: Set<string>) => predicate(aliases, c);
      const memoKey = memoize?.(c);
      if (memoKey) {
        const memo = c.resolve<IMemo>(IMemoKey);
        const memoized = memo.get(memoKey);
        if (memoized) {
          return c.resolve(memoized[0], { args });
        }
        const [key, result] = c.resolveOneByAlias(predicateFn, { args });
        memo.set(memoKey, [key]);
        return result;
      }
      return c.resolveOneByAlias(predicateFn, { args })[1];
    },

  /**
   * Get all instances that match the given keys
   * @param keys
   */
  keys:
    (...keys: InjectionToken[]) =>
    (с: IContainer, ...args: unknown[]) =>
      keys.map((t) => с.resolve(t, { args })),

  /**
   * Get the instance that matches the given key
   * @param key
   * @param deps
   */
  key:
    <T>(key: InjectionToken<T>, ...deps: unknown[]) =>
    (c: IContainer, ...args: unknown[]) =>
      c.resolve<T>(key, { args: [...deps, ...args] }),

  lazy: {
    key:
      <T extends object>(key: InjectionToken<T>, ...deps: unknown[]) =>
      (c: IContainer, ...args: unknown[]) => {
        let instance: T | undefined;
        return new Proxy(
          {},
          {
            get: (_, prop) => {
              instance = instance ?? c.resolve<T>(key, { args: [...deps, ...args] });
              // @ts-ignore
              return instance[prop];
            },
          },
        ) as T;
      },
  },

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
