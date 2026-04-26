import { DependencyKey, IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { IRegistration } from '../registration/IRegistration';
import { ArgsFn, ProviderOptions } from '../provider/IProvider';

export class SingleToken<T = any> extends InjectionToken<T> {
  private readonly _getArgsFn: ArgsFn;
  private readonly _isLazy: boolean;

  constructor(
    public token: DependencyKey,
    { getArgsFn = () => [], isLazy = false }: { getArgsFn?: ArgsFn; isLazy?: boolean } = {},
  ) {
    super();
    this._getArgsFn = getArgsFn;
    this._isLazy = isLazy;
  }

  select<R>(fn: (target: T) => R) {
    return (s: IContainer) => fn(this.resolve(s));
  }

  resolve(s: IContainer, { args = [], lazy }: ProviderOptions = {}): T {
    return s.resolve(this.token, {
      args: this._getArgsFn(s, { args }),
      lazy: this._isLazy || lazy,
    });
  }

  bindTo(r: IRegistration<T>) {
    r.bindToKey(this.token);
  }

  args(...newArgs: unknown[]) {
    const parentFn = this._getArgsFn;
    return new SingleToken<T>(this.token, {
      getArgsFn: (s, opts) => [...parentFn(s, opts), ...newArgs],
      isLazy: this._isLazy,
    });
  }

  argsFn(fn: (s: IContainer) => unknown[]) {
    const parentFn = this._getArgsFn;
    return new SingleToken<T>(this.token, {
      getArgsFn: (s, opts) => [...parentFn(s, opts), ...fn(s)],
      isLazy: this._isLazy,
    });
  }

  lazy() {
    return new SingleToken<T>(this.token, {
      getArgsFn: this._getArgsFn,
      isLazy: true,
    });
  }
}
