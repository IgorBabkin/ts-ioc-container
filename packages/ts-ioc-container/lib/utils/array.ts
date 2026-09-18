import { ArgumentNotFoundError } from '../errors/ArgumentNotFoundError';

export type Predicate<T> = (value: T) => boolean;

export const Filter = {
  exclude: <T>(arr: Set<T> | T[]) => {
    const excludeSet = arr instanceof Array ? new Set(arr) : arr;
    return (v: T) => !excludeSet.has(v);
  },
};

/**
 * Returns a variadic picker of the first argument matching `predicate` - the
 * shape `singleton(getCacheKey)` and `argsFn` consumers expect.
 *
 * @throws {ArgumentNotFoundError} when no argument matches `predicate`
 */
export const findOrFail =
  <T>(predicate: Predicate<T>) =>
  (...args: unknown[]): T => {
    const index = args.findIndex((arg) => predicate(arg as T));

    if (index === -1) {
      throw new ArgumentNotFoundError();
    }

    return args[index] as T;
  };
