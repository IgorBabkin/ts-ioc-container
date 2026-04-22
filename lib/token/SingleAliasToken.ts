import { DependencyKey, IContainer, ResolveOneOptions } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { IRegistration } from '../registration/IRegistration';
import { BindToken } from './BindToken';
import { ArgsFn } from '../provider/IProvider';

export class SingleAliasToken<T = any> extends InjectionToken<T> implements BindToken<T> {
  private getArgsFn: ArgsFn = () => [];
  private isLazy: boolean = false;

  constructor(readonly token: DependencyKey) {
    super();
  }

  select<R>(fn: (target: T) => R) {
    return (s: IContainer) => fn(this.resolve(s));
  }

  resolve(s: IContainer, { args = [], lazy = false }: ResolveOneOptions = {}): T {
    return s.resolveOneByAlias(this.token, {
      args: this.getArgsFn(s, { args }),
      lazy: this.isLazy || lazy,
    });
  }

  bindTo(r: IRegistration<T>) {
    r.bindToAlias(this.token);
  }

  args(...args: unknown[]) {
    this.getArgsFn = () => [];
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

export const toSingleAlias = <T>(token: DependencyKey) => new SingleAliasToken<T>(token);
