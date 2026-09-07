type ProxyState<T extends object> = {
  getTarget: () => T;
};

const proxyStateMap = new WeakMap<object, ProxyState<object>>();

export const unwrapProxyTarget = <T extends object>(value: T): T => {
  return isProxy(value) ? getProxyTarget(value) : value;
};

export function isProxy(value: object): boolean {
  return proxyStateMap.has(value);
}

export function getProxyTarget<T extends object>(value: T): T {
  const target = proxyStateMap.get(value)!.getTarget() as T;
  return unwrapProxyTarget(target);
}

export function createProxy<T extends object>(target: T, handler: ProxyHandler<T> = {}): T {
  const proxy = new Proxy(target, handler);
  proxyStateMap.set(proxy, { getTarget: () => target } as ProxyState<object>);
  return proxy;
}

export function lazyProxy<T extends object>(resolveInstance: () => T): T {
  let instance: T | undefined;
  const getTarget = (): T => {
    instance = instance ?? resolveInstance();
    return instance;
  };

  const proxy = createProxy({} as T, {
    get: (_, prop) => {
      const target = getTarget();
      // @ts-ignore
      return target[prop];
    },
  });
  // the {} passed to createProxy is a placeholder; override its registration so
  // getProxyTarget resolves the real (lazily-computed) instance instead of {}
  proxyStateMap.set(proxy, { getTarget } as ProxyState<object>);

  return proxy;
}

export function toLazyIf<T extends object>(resolveInstance: () => T, isLazy: boolean = false): T {
  if (isLazy) {
    return lazyProxy(resolveInstance);
  }
  return resolveInstance();
}
