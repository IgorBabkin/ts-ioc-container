export const debounce =
  (ms: number): MethodDecorator =>
  (target, propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const timerMap = new WeakMap<object, ReturnType<typeof setTimeout>>();
    descriptor.value = function (...args: unknown[]) {
      const prev = timerMap.get(this);
      if (prev !== undefined) {
        clearTimeout(prev);
      }
      timerMap.set(
        this,
        setTimeout(() => originalMethod.apply(this, args), ms),
      );
    };
    return descriptor;
  };
