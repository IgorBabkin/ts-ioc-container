export function lazyProxy<T>(resolveInstance: () => T): T {
  let instance: T | undefined;
  return new Proxy(
    {},
    {
      get: (_, prop) => {
        instance = instance ?? resolveInstance();
        // @ts-ignore
        return instance[prop];
      },
    },
  ) as T;
}

export function toLazyIf<T>(resolveInstance: () => T, isLazy: boolean = false): T {
  if (isLazy) {
    return lazyProxy(resolveInstance);
  }
  return resolveInstance();
}
