type ProxyState<T extends object> = {
  getTarget: () => T;
};

/**
 * The proxy operations the library depends on. Depend on this rather than on
 * {@link ProxyRegistry} itself, so a caller can substitute its own
 * implementation - the concrete registry is a singleton and cannot be
 * constructed a second time.
 */
export interface IProxyRegistry {
  /**
   * Returns the real object behind `value`, unwrapping proxies stacked to any
   * depth. A value that is not a proxy is returned as is.
   *
   * The library calls this itself wherever a proxy would give the wrong answer -
   * every read of class metadata (see `resolveConstructor`, `getHooks`,
   * `resolveArgs`) and every identity check against a tracked instance (see
   * `IContainer.hasInstance`). Pass the container's own values to those APIs as
   * they come; unwrapping by hand is for code that needs the real object for its
   * own reasons.
   */
  unwrap<T extends object>(value: T): T;

  createProxy<T extends object>(target: T, handler?: ProxyHandler<T>): T;

  /**
   * Creates a proxy that resolves its target on first access and caches it.
   */
  createLazyProxy<T extends object>(resolveInstance: () => T): T;

  /**
   * Wraps `resolveInstance` in a lazy proxy when `isLazy`, otherwise calls it
   * right away.
   */
  toLazyIf<T extends object>(resolveInstance: () => T, isLazy?: boolean): T;
}

/**
 * Creates proxies and tracks them, so a proxy can be traced back to the real
 * object it stands for. The library's own {@link IProxyRegistry}.
 *
 * Process-wide singleton: a proxy created anywhere must be unwrappable
 * everywhere, and the registry holds no configuration that would justify a
 * second instance. Obtain it with {@link ProxyRegistry.getInstance}.
 *
 * Entries are held weakly - a proxy that becomes unreachable is collected along
 * with its state.
 */
export class ProxyRegistry implements IProxyRegistry {
  private static instance?: ProxyRegistry;

  private readonly states = new WeakMap<object, ProxyState<object>>();

  private constructor() {}

  static getInstance(): ProxyRegistry {
    ProxyRegistry.instance ??= new ProxyRegistry();
    return ProxyRegistry.instance;
  }

  /**
   * Returns the real object behind `value`, unwrapping proxies stacked to any
   * depth. A value that is not a proxy is returned as is.
   */
  unwrap<T extends object>(value: T): T {
    return this.isProxy(value) ? this.getTarget(value) : value;
  }

  createProxy<T extends object>(target: T, handler: ProxyHandler<T> = {}): T {
    const proxy = new Proxy(target, handler);
    return this.register(proxy, { getTarget: () => target });
  }

  /**
   * Creates a proxy that resolves its target on first access and caches it.
   * The target is unwrapped on resolution, so wrapping a lazy proxy in another
   * lazy proxy never stacks beyond one level.
   */
  createLazyProxy<T extends object>(resolveInstance: () => T): T {
    let instance: T | undefined;
    const state: ProxyState<T> = {
      getTarget: () => {
        instance = instance ?? this.unwrap(resolveInstance());
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
        // The proxy stands in for the target, so writes must reach it. Without this
        // the empty object above would absorb them - including writes a method makes
        // to `this` when it is called through the proxy.
        set: (_, prop, value) => {
          const target = state.getTarget();
          // @ts-ignore
          target[prop] = value;
          return true;
        },
      },
    ) as T;

    return this.register(proxy, state);
  }

  /**
   * Wraps `resolveInstance` in a lazy proxy when `isLazy`, otherwise calls it
   * right away.
   */
  toLazyIf<T extends object>(resolveInstance: () => T, isLazy: boolean = false): T {
    return isLazy ? this.createLazyProxy(resolveInstance) : resolveInstance();
  }

  private isProxy(value: object): boolean {
    return this.states.has(value);
  }

  private getTarget<T extends object>(value: T): T {
    const target = this.states.get(value)!.getTarget() as T;
    return this.unwrap(target);
  }

  private register<T extends object>(proxy: T, state: ProxyState<T>): T {
    this.states.set(proxy, state as ProxyState<object>);
    return proxy;
  }
}

/**
 * The real object behind `value`, unwrapping proxies stacked to any depth. A
 * value that is not a proxy is returned as is.
 *
 * A shortcut for `ProxyRegistry.getInstance().unwrap(value)` - the registry is a
 * process-wide singleton, so unwrapping never needs an instance of its own. The
 * library already unwraps wherever a proxy would give the wrong answer (reading
 * class metadata, and `IContainer.hasInstance`), so reach for this only when
 * your own code needs the real object - an identity check of your own, or
 * bypassing a lazy proxy on purpose.
 *
 * Note that unwrapping a lazy proxy resolves its target, which is the point:
 * there is no real object to hand back until it does.
 */
export const unwrapProxy = <T extends object>(value: T): T => ProxyRegistry.getInstance().unwrap(value);
