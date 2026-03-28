type ProxyState<T extends object> = {
  getTarget: () => T;
};

const proxyStateMap = new WeakMap<object, ProxyState<object>>();

export function isProxy(value: object): boolean {
  return proxyStateMap.has(value);
}

export function getProxyTarget<T extends object>(value: T): T {
  return proxyStateMap.get(value)!.getTarget() as T;
}

export function lazyProxy<T extends object>(resolveInstance: () => T): T {
  let instance: T | undefined;
  const state: ProxyState<T> = {
    getTarget: () => {
      instance = instance ?? resolveInstance();
      return instance;
    },
  };

  const proxy = new Proxy(
    {},
    {
      get: (_, prop) => {
        const target = state.getTarget();
        // @ts-ignore
        return target[prop];
      },
    },
  ) as T;

  proxyStateMap.set(proxy, state as ProxyState<object>);

  return proxy;
}

export function toLazyIf<T extends object>(resolveInstance: () => T, isLazy: boolean = false): T {
  if (isLazy) {
    return lazyProxy(resolveInstance);
  }
  return resolveInstance();
}
