import { AliasPredicate, IContainer, InjectionToken } from './container/IContainer';

export type InstancePredicate = (dep: unknown) => boolean;
export const all: InstancePredicate = () => true;

export const by = {
  aliases:
    (predicate: AliasPredicate) =>
    (c: IContainer, ...args: unknown[]) =>
      c.resolveManyByAlias(predicate, { args }).values(),

  /**
   * Get the instance that matches the given alias or fail
   * @param predicate
   */
  alias:
    (predicate: AliasPredicate) =>
    (c: IContainer, ...args: unknown[]) => {
      return c.resolveOneByAlias(predicate, { args });
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
