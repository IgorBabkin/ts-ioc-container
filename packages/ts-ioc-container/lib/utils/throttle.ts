export const throttle =
  (ms: number): MethodDecorator =>
  (target, propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const lastCalledMap = new WeakMap<object, number>();
    descriptor.value = function (...args: unknown[]) {
      const now = Date.now();
      const lastCalled = lastCalledMap.get(this) ?? -Infinity;
      if (now - lastCalled < ms) {
        return undefined;
      }
      lastCalledMap.set(this, now);
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
