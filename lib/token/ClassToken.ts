import { IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { type constructor } from '../utils/basic';
import { ArgsFn, ProviderOptions } from '../provider/IProvider';

export class ClassToken<T = any> extends InjectionToken<T> {
  private getArgsFn: ArgsFn = () => [];
  private isLazy: boolean = false;

  constructor(private readonly target: constructor<T>) {
    super();
  }

  select<R>(fn: (target: T) => R) {
    return (s: IContainer) => fn(this.resolve(s));
  }

  resolve(s: IContainer, { args = [], lazy = false }: ProviderOptions = {}): T {
    return s.resolve(this.target, {
      args: this.getArgsFn(s, { args }),
      lazy: this.isLazy || lazy,
    });
  }

  args(...args: unknown[]) {
    this.getArgsFn = () => args;
    return this;
  }

  argsFn(fn: ArgsFn) {
    this.getArgsFn = fn;
    return this;
  }

  lazy() {
    this.isLazy = true;
    return this;
  }
}
