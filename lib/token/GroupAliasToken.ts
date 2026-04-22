import { DependencyKey, IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { IRegistration } from '../registration/IRegistration';
import { BindToken } from './BindToken';
import { ArgsFn, ProviderOptions } from '../provider/IProvider';

export class GroupAliasToken<T = any> extends InjectionToken<T[]> implements BindToken<T> {
  private getArgsFn: ArgsFn = () => [];
  private isLazy: boolean = false;

  constructor(readonly token: DependencyKey) {
    super();
  }

  select<R>(fn: (target: T[]) => R[]) {
    return (s: IContainer) => fn(this.resolve(s));
  }

  resolve(s: IContainer, { args = [], lazy = false }: ProviderOptions = {}): T[] {
    return s.resolveByAlias(this.token, {
      args: this.getArgsFn(s, { args }),
      lazy: this.isLazy || lazy,
    });
  }

  bindTo(r: IRegistration<T>) {
    r.bindToAlias(this.token);
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

export const toGroupAlias = <T>(token: DependencyKey) => new GroupAliasToken<T>(token);
