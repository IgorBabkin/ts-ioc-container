import { type constructor } from '../utils';
import { type IContainer, ResolveOneOptions } from '../container/IContainer';

type WithArgs = { args: unknown[] };
export type InjectOptions = Partial<WithArgs>;

export interface IInjector {
  resolve<T>(container: IContainer, value: constructor<T>, options?: InjectOptions): T;
}

export interface IInjectFnResolver<T> {
  resolve(s: IContainer, options?: ResolveOneOptions): T;
}

export abstract class Injector implements IInjector {
  resolve<T>(scope: IContainer, Target: constructor<T>, options?: InjectOptions): T {
    return this.createInstance(scope, Target, options);
  }

  protected abstract createInstance<T>(scope: IContainer, Target: constructor<T>, options?: InjectOptions): T;
}
