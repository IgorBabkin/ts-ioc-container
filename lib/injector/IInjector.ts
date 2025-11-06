import { type IContainer, ResolveOneOptions } from '../container/IContainer';
import { constructor, Instance } from '../types';
import { ProviderOptions } from '../provider/IProvider';
import { toLazyIf } from '../utils';

type WithArgs = { args: unknown[] };
export type InjectOptions = Partial<WithArgs>;

export interface IInjector {
  resolve<T>(container: IContainer, value: constructor<T>, options?: ProviderOptions): T;
}

export interface IInjectFnResolver<T> {
  resolve(s: IContainer, options?: ResolveOneOptions): T;
}

export abstract class Injector {
  resolve<T>(scope: IContainer, Target: constructor<T>, { args, lazy }: ProviderOptions = {}): T {
    return toLazyIf(() => {
      const instance = this.createInstance(scope, Target, { args });
      scope.addInstance(instance as Instance);
      return instance;
    }, lazy);
  }

  protected abstract createInstance<T>(scope: IContainer, Target: constructor<T>, options?: InjectOptions): T;
}
