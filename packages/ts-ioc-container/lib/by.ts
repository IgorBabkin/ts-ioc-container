import { AliasPredicate, DependencyKey, IContainer, InjectionToken } from './container/IContainer';
import { DependencyNotFoundError } from './errors/DependencyNotFoundError';

export type InstancePredicate = (dep: unknown) => boolean;
export const all: InstancePredicate = () => true;
export const isPresent = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

export const resolveSilently =
  (c: IContainer, ...args: unknown[]) =>
  (key: DependencyKey) => {
    try {
      return c.resolve(key, ...args);
    } catch (e) {
      if (e instanceof DependencyNotFoundError) {
        return undefined;
      }
      throw e;
    }
  };

export const by = {
  aliases:
    (predicate: AliasPredicate) =>
    (c: IContainer, ...args: unknown[]) =>
      c
        .getKeysByAlias(predicate)
        .map(resolveSilently(c, ...args))
        .filter(isPresent),

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
