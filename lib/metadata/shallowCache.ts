export const shallowCache =
  (getKeyByArgs: (...args: unknown[]) => unknown): MethodDecorator =>
  (target, propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const cacheMap = new WeakMap<object, Map<unknown, unknown>>();
    descriptor.value = function (...args: unknown[]) {
      let cache = cacheMap.get(this);
      if (cache === undefined) {
        cache = new Map();
        cacheMap.set(this, cache);
      }
      const key = getKeyByArgs(...args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = originalMethod.apply(this, args);
      cache.set(key, result);
      return result;
    };
    return descriptor;
  };
