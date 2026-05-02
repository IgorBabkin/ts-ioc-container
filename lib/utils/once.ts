type RepeatOptions = {
  index: number;
  args: unknown[];
};

export const once =
  ({ onRepeat }: { onRepeat?: (options: RepeatOptions) => void } = {}): MethodDecorator =>
  (target, propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const cacheMap = new WeakMap<object, unknown>();
    let index = 0;
    descriptor.value = function (...args: unknown[]) {
      index++;
      if (cacheMap.has(this)) {
        onRepeat?.({ index: index - 1, args });
        return cacheMap.get(this);
      }
      const result = originalMethod.apply(this, args);
      cacheMap.set(this, result);
      return result;
    };
    return descriptor;
  };
