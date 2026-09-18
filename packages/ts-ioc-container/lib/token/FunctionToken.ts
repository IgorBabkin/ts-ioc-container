import type { IContainer } from '../container/IContainer';
import { forwardArgs, InjectionToken } from './InjectionToken';
import { InjectFn } from '../hooks/hook';
import { ArgsFn, ResolveOptions } from '../provider/IProvider';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { Serializable } from '../utils/basic';

export class FunctionToken<T = any> extends InjectionToken<T> implements Serializable {
  private readonly _getArgsFn: ArgsFn;
  private readonly _isLazy: boolean;

  constructor(
    private readonly fn: InjectFn<T>,
    {
      getArgsFn = forwardArgs,
      isLazy = false,
      tags = [],
    }: { getArgsFn?: ArgsFn; isLazy?: boolean; tags?: string[] } = {},
  ) {
    super(tags);
    this._getArgsFn = getArgsFn;
    this._isLazy = isLazy;
  }

  resolve(s: IContainer, { args = [], lazy }: ResolveOptions = {}): T {
    return this.fn({
      scope: s,
      args: this._getArgsFn({ scope: s, args }),
      lazy: this._isLazy || lazy,
    });
  }

  args(...newArgs: unknown[]): InjectionToken<T> {
    const parentFn = this._getArgsFn;
    return new FunctionToken<T>(this.fn, {
      getArgsFn: (options) => [...parentFn(options), ...newArgs],
      isLazy: this._isLazy,
      tags: this.getTags(),
    });
  }

  argsFn(fn: (s: IContainer) => unknown[]): InjectionToken<T> {
    const parentFn = this._getArgsFn;
    return new FunctionToken<T>(this.fn, {
      getArgsFn: (options) => [...parentFn(options), ...fn(options.scope)],
      isLazy: this._isLazy,
      tags: this.getTags(),
    });
  }

  lazy(): InjectionToken<T> {
    return new FunctionToken<T>(this.fn, {
      getArgsFn: this._getArgsFn,
      isLazy: true,
      tags: this.getTags(),
    });
  }

  addTags(...tags: string[]): FunctionToken<T> {
    return new FunctionToken<T>(this.fn, {
      getArgsFn: this._getArgsFn,
      isLazy: this._isLazy,
      tags: [...this.getTags(), ...tags],
    });
  }

  /**
   * @throws {MethodNotImplementedError} always — a function token has no underlying key.
   */
  toString(): string {
    throw new MethodNotImplementedError('not implemented');
  }
}
