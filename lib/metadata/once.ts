export const once: MethodDecorator = (target, propertyKey, descriptor: PropertyDescriptor) => {
  const originalMethod = descriptor.value;
  const cacheMap = new WeakMap<object, unknown>();
  descriptor.value = function (...args: unknown[]) {
    if (cacheMap.has(this)) {
      return cacheMap.get(this);
    }
    const result = originalMethod.apply(this, args);
    cacheMap.set(this, result);
    return result;
  };
  return descriptor;
};
