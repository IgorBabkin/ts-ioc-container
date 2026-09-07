import { type IContainer, ResolveOneOptions } from '../container/IContainer';
import { ProviderOptions } from '../provider/IProvider';
import { type IProxyRegistry, ProxyRegistry } from '../utils/ProxyRegistry';
import { type constructor, Instance } from '../utils/basic';

export type WithArgs = { args: unknown[] };
export type InjectOptions = Partial<WithArgs>;

export interface IInjector {
  resolve<T>(container: IContainer, value: constructor<T>, options?: ProviderOptions): T;
}

export interface IInjectFnResolver<T> {
  resolve(s: IContainer, options?: ResolveOneOptions): T;
}

export abstract class Injector {
  constructor(private readonly proxyRegistry: IProxyRegistry = ProxyRegistry.getInstance()) {}

  resolve<T>(scope: IContainer, Target: constructor<T>, { args, lazy }: ProviderOptions = {}): T {
    // @ts-ignore
    return this.proxyRegistry.toLazyIf(() => {
      const instance = this.createInstance(scope, Target, { args });
      scope.addInstance(instance as Instance);
      return instance;
    }, lazy);
  }

  protected abstract createInstance<T>(scope: IContainer, Target: constructor<T>, options?: InjectOptions): T;
}
