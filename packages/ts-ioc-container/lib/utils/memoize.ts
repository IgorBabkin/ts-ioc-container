/**
 * Wraps a two-argument function so each `(target, key)` pair is computed once
 * and reused. `target` is held weakly, so memoizing against a class or an
 * instance keeps nothing alive.
 *
 * ```typescript
 * const hooksOf = memoize((Target: constructor<unknown>, key: string | symbol) => merge(Target, key));
 * ```
 */
export const memoize = <T extends object, K, R>(fn: (target: T, key: K) => R): ((target: T, key: K) => R) => {
  const cache = new WeakMap<T, Map<K, R>>();

  return (target, key) => {
    let byKey = cache.get(target);
    if (!byKey) {
      byKey = new Map();
      cache.set(target, byKey);
    }
    if (!byKey.has(key)) {
      byKey.set(key, fn(target, key));
    }
    return byKey.get(key) as R;
  };
};
