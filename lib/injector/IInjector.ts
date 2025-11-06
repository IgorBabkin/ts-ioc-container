import { type IContainer, ResolveOneOptions } from '../container/IContainer';
import { constructor, Instance } from '../types';

type WithArgs = { args: unknown[] };
export type InjectOptions = Partial<WithArgs>;

export interface IInjector {
  resolve<T>(container: IContainer, value: constructor<T>, options?: InjectOptions): T;
}

export interface IInjectFnResolver<T> {
  resolve(s: IContainer, options?: ResolveOneOptions): T;
}

export abstract class Injector {
  resolve<T>(scope: IContainer, Target: constructor<T>, options?: InjectOptions): T {
    const instance = this.createInstance(scope, Target, options);
    scope.addInstance(instance as Instance);
    return instance;
  }

  protected abstract createInstance<T>(scope: IContainer, Target: constructor<T>, options?: InjectOptions): T;
}
