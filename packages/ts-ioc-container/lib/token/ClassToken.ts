import { IContainer } from '../container/IContainer';
import { forwardArgs, InjectionToken } from './InjectionToken';
import { type constructor, Serializable } from '../utils/basic';
import { ArgsFn, ProviderOptions } from '../provider/IProvider';

export class ClassToken<T = any> extends InjectionToken<T> implements Serializable {
  private readonly _getArgsFn: ArgsFn;
  private readonly _isLazy: boolean;

  constructor(
    private readonly target: constructor<T>,
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
      tags: this.getTags(),
    });
  }

  argsFn(fn: (s: IContainer) => unknown[]) {
    const parentFn = this._getArgsFn;
    return new ClassToken<T>(this.target, {
      getArgsFn: (s, opts) => [...parentFn(s, opts), ...fn(s)],
      isLazy: this._isLazy,
      tags: this.getTags(),
    });
  }

  lazy() {
    return new ClassToken<T>(this.target, {
      getArgsFn: this._getArgsFn,
      isLazy: true,
      tags: this.getTags(),
    });
  }

  addTags(...tags: string[]): ClassToken<T> {
    return new ClassToken<T>(this.target, {
      getArgsFn: this._getArgsFn,
      isLazy: this._isLazy,
      tags: [...this.getTags(), ...tags],
    });
  }

  toString(): string {
    return this.target.name;
  }
}
