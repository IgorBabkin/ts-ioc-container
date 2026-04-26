import { DependencyKey, IContainer, ResolveOneOptions } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { IRegistration } from '../registration/IRegistration';
import { BindToken } from './BindToken';
import { ArgsFn } from '../provider/IProvider';

export class SingleAliasToken<T = any> extends InjectionToken<T> implements BindToken<T> {
  private readonly _getArgsFn: ArgsFn;
  private readonly _isLazy: boolean;

  constructor(
    readonly token: DependencyKey,
    { getArgsFn = () => [], isLazy = false }: { getArgsFn?: ArgsFn; isLazy?: boolean } = {},
  ) {
    super();
    this._getArgsFn = getArgsFn;
    this._isLazy = isLazy;
  }

  select<R>(fn: (target: T) => R) {
    return (s: IContainer) => fn(this.resolve(s));
  }

  resolve(s: IContainer, { args = [], lazy }: ResolveOneOptions = {}): T {
    return s.resolveOneByAlias(this.token, {
      args: this._getArgsFn(s, { args }),
      lazy: this._isLazy || lazy,
    });
  }

  bindTo(r: IRegistration<T>) {
    r.bindToAlias(this.token);
  }

  args(...newArgs: unknown[]) {
    const parentFn = this._getArgsFn;
    return new SingleAliasToken<T>(this.token, {
      getArgsFn: (s, opts) => [...parentFn(s, opts), ...newArgs],
      isLazy: this._isLazy,
    });
  }

  argsFn(fn: (s: IContainer) => unknown[]) {
    const parentFn = this._getArgsFn;
    return new SingleAliasToken<T>(this.token, {
      getArgsFn: (s, opts) => [...parentFn(s, opts), ...fn(s)],
      isLazy: this._isLazy,
    });
  }

  lazy() {
    return new SingleAliasToken<T>(this.token, {
      getArgsFn: this._getArgsFn,
      isLazy: true,
    });
  }
}

export const toSingleAlias = <T>(token: DependencyKey) => new SingleAliasToken<T>(token);
