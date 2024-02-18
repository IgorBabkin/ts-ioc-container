import { DependencyKey, IContainer, InjectionToken } from './container/IContainer';

export type InstancePredicate = (dep: unknown) => boolean;
export const all: InstancePredicate = () => true;

export const by = {
  alias: {
    /**
     * Get all instances that have at least one of the given aliases
     * @param aliases
     */
    some:
      (...aliases: DependencyKey[]) =>
      (с: IContainer, ...args: unknown[]) =>
        с.getTokensByProvider((p) => aliases.some((alias) => p.hasAlias(alias))).map((t) => с.resolve(t, ...args)),

    /**
     * Get all instances that have all of the given aliases
     * @param aliases
     */
    all:
      (...aliases: DependencyKey[]) =>
      (с: IContainer, ...args: unknown[]) =>
        с.getTokensByProvider((p) => aliases.every((alias) => p.hasAlias(alias))).map((t) => с.resolve(t, ...args)),
  },

  /**
   * Get all instances that match the given keys
   * @param keys
   */
  keys:
    (...keys: InjectionToken[]) =>
    (с: IContainer, ...args: unknown[]) =>
      keys.map((t) => с.resolve(t, ...args)),

  /**
   * Get the instance that matches the given key
   * @param key
   * @param deps
   */
  key:
    <T>(key: InjectionToken<T>, ...deps: unknown[]) =>
    (c: IContainer, ...args: unknown[]) =>
      c.resolve<T>(key, ...deps, ...args),

  /**
   * Get all instances that match the given predicate
   * @param predicate
   */
  instances:
    (predicate: InstancePredicate = all) =>
    (l: IContainer) =>
      l.getInstances().filter(predicate),

  /**
   * Get the current scope
   */
  currentScope: (container: IContainer) => container,

  /**
   * Create a new scope with the given tags
   * @param tags
   */
  createScope:
    (...tags: string[]) =>
    (l: IContainer) =>
      l.createScope(...tags),
};
