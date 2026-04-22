import type { IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { InjectFn } from '../hooks/hook';
import { ArgsFn, ProviderOptions } from '../provider/IProvider';

export class FunctionToken<T = any> extends InjectionToken<T> {
  private getArgsFn: ArgsFn = () => [];
  private isLazy: boolean = false;

  constructor(private readonly fn: InjectFn<T>) {
    super();
  }

  resolve(s: IContainer, { args = [], lazy = false }: ProviderOptions = {}): T {
    return this.fn(s, {
      args: this.getArgsFn(s, { args }),
      lazy: this.isLazy || lazy,
    });
  }

  args(...deps: unknown[]): InjectionToken<T> {
    this.getArgsFn = () => deps;
    return this;
  }

  argsFn(getArgsFn: (s: IContainer) => unknown[]): InjectionToken<T> {
    this.getArgsFn = getArgsFn;
    return this;
  }

  lazy(isLazy: boolean = true): InjectionToken<T> {
    this.isLazy = isLazy;
    return this;
  }
}
