import type { DependencyKey, IContainer } from '../container/IContainer';
import { forwardArgs, InjectionToken } from './InjectionToken';
import { InjectFn } from '../hooks/hook';
import { ArgsFn, ProviderOptions } from '../provider/IProvider';
import { type constructor } from '../utils/basic';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';

export class FunctionToken<T = any> extends InjectionToken<T> {
  private readonly _getArgsFn: ArgsFn;
  private readonly _isLazy: boolean;

  constructor(
    private readonly fn: InjectFn<T>,
    { getArgsFn = forwardArgs, isLazy = false }: { getArgsFn?: ArgsFn; isLazy?: boolean } = {},
  ) {
    super();
    this._getArgsFn = getArgsFn;
    this._isLazy = isLazy;
  }

  resolve(s: IContainer, { args = [], lazy }: ProviderOptions = {}): T {
    return this.fn(s, {
      args: this._getArgsFn(s, { args }),
      lazy: this._isLazy || lazy,
    });
  }

  args(...newArgs: unknown[]): InjectionToken<T> {
    const parentFn = this._getArgsFn;
    return new FunctionToken<T>(this.fn, {
      getArgsFn: (s, opts) => [...parentFn(s, opts), ...newArgs],
      isLazy: this._isLazy,
    });
  }

  argsFn(fn: (s: IContainer) => unknown[]): InjectionToken<T> {
    const parentFn = this._getArgsFn;
    return new FunctionToken<T>(this.fn, {
      getArgsFn: (s, opts) => [...parentFn(s, opts), ...fn(s)],
      isLazy: this._isLazy,
    });
  }

  lazy(): InjectionToken<T> {
    return new FunctionToken<T>(this.fn, {
      getArgsFn: this._getArgsFn,
      isLazy: true,
    });
  }

  /**
   * @throws {MethodNotImplementedError} always — a function token has no underlying key.
   */
  getKey(): DependencyKey | constructor<T> {
    throw new MethodNotImplementedError('not implemented');
  }
}
