import { DependencyKey, IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { IRegistration } from '../registration/IRegistration';
import { ArgsFn, ProviderOptions } from '../provider/IProvider';

export class SingleToken<T = any> extends InjectionToken {
  private getArgsFn: ArgsFn = () => [];
  private isLazy: boolean = false;

  constructor(public token: DependencyKey) {
    super();
  }

  select<R>(fn: (target: T) => R) {
    return (s: IContainer) => fn(this.resolve(s));
  }

  resolve(s: IContainer, { args = [], lazy = false }: ProviderOptions = {}): T {
    return s.resolve(this.token, {
      args: this.getArgsFn(s, { args }),
      lazy: this.isLazy || lazy,
    });
  }

  bindTo(r: IRegistration<T>) {
    r.bindToKey(this.token);
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
