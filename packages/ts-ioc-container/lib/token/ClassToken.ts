import { IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { type constructor } from '../utils/basic';
import { ArgsFn, ProviderOptions } from '../provider/IProvider';

export class ClassToken<T = any> extends InjectionToken<T> {
  private readonly _getArgsFn: ArgsFn;
  private readonly _isLazy: boolean;

  constructor(
    private readonly target: constructor<T>,
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
    return s.resolve(this.target, {
      args: this._getArgsFn(s, { args }),
      lazy: this._isLazy || lazy,
    });
  }

  args(...newArgs: unknown[]) {
    const parentFn = this._getArgsFn;
    return new ClassToken<T>(this.target, {
      getArgsFn: (s, opts) => [...parentFn(s, opts), ...newArgs],
      isLazy: this._isLazy,
    });
  }

  argsFn(fn: (s: IContainer) => unknown[]) {
    const parentFn = this._getArgsFn;
    return new ClassToken<T>(this.target, {
      getArgsFn: (s, opts) => [...parentFn(s, opts), ...fn(s)],
      isLazy: this._isLazy,
    });
  }

  lazy() {
    return new ClassToken<T>(this.target, {
      getArgsFn: this._getArgsFn,
      isLazy: true,
    });
  }
}
