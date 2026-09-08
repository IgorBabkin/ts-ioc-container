import { type IContainer, ResolveOneOptions } from '../container/IContainer';
import { ProviderOptions } from '../provider/IProvider';
import { type IProxyRegistry, ProxyRegistry } from '../utils/ProxyRegistry';
import { type constructor, Instance } from '../utils/basic';

export type WithArgs = { args: unknown[] };
export type InjectOptions = Partial<WithArgs>;

/**
 * Injector hooks - the injector's own domain: an instance was constructed.
 *
 * Construction is the injector's business, so the hook list belongs to the
 * injector rather than to a scope. One injector is shared by a container and
 * every scope created from it, so a hook added here observes construction in
 * all of them.
 */
export type InjectorHook = (instance: Instance, scope: IContainer) => void;

export interface IInjector {
  resolve<T>(container: IContainer, value: constructor<T>, options?: ProviderOptions): T;

  onConstructed(...hooks: InjectorHook[]): this;
}

/**
 * The injector counterpart of `IContainerModule`: an opt-in bundle of injector
 * hooks, applied to the injector before it is handed to a container.
 */
export interface IInjectorModule {
  applyTo(injector: IInjector): void;
}

export interface IInjectFnResolver<T> {
  resolve(s: IContainer, options?: ResolveOneOptions): T;
}

export abstract class Injector {
  private readonly onConstructedHookList: InjectorHook[] = [];

  constructor(private readonly proxyRegistry: IProxyRegistry = ProxyRegistry.getInstance()) {}

  resolve<T>(scope: IContainer, Target: constructor<T>, { args, lazy }: ProviderOptions = {}): T {
    // @ts-ignore
    return this.proxyRegistry.toLazyIf(() => {
      const instance = this.createInstance(scope, Target, { args }) as Instance;
      scope.addInstance(instance);

      // Hooks run once the scope tracks the instance, so they observe a scope which owns it.
      for (const onConstructed of this.onConstructedHookList) {
        onConstructed(instance, scope);
      }

      return instance;
    }, lazy);
  }

  /**
   * Hooks run after the constructed instance is handed to the scope, and before
   * it reaches the caller. A `lazy` resolve returns a proxy first, so its hooks
   * run when the proxy is first touched.
   */
  onConstructed(...hooks: InjectorHook[]): this {
    this.onConstructedHookList.push(...hooks);
    return this;
  }

  useModule(module: IInjectorModule): this {
    module.applyTo(this);
    return this;
  }

  protected abstract createInstance<T>(scope: IContainer, Target: constructor<T>, options?: InjectOptions): T;
}
