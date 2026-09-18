import { DependencyKey, IContainer } from '../container/IContainer';
import { forwardArgs, InjectionToken } from './InjectionToken';
import { IRegistration } from '../registration/IRegistration';
import { BindToken } from './BindToken';
import { ArgsFn, ResolveOptions } from '../provider/IProvider';
import { Serializable } from '../utils/basic';

export class GroupAliasToken<T = any> extends InjectionToken<T[]> implements BindToken<T>, Serializable {
  private readonly _getArgsFn: ArgsFn;
  private readonly _isLazy: boolean;

  constructor(
    readonly token: DependencyKey,
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

  select<R>(fn: (target: T[]) => R[]) {
    return (s: IContainer) => fn(this.resolve(s));
  }

  resolve(s: IContainer, { args = [], lazy }: ResolveOptions = {}): T[] {
    return s.resolveByAlias(this.token, {
      args: this._getArgsFn({ scope: s, args }),
      lazy: this._isLazy || lazy,
    });
  }

  bindTo(r: IRegistration<T>) {
    r.bindToAlias(this.token);
  }

  args(...newArgs: unknown[]) {
    const parentFn = this._getArgsFn;
    return new GroupAliasToken<T>(this.token, {
      getArgsFn: (options) => [...parentFn(options), ...newArgs],
      isLazy: this._isLazy,
      tags: this.getTags(),
    });
  }

  argsFn(fn: (s: IContainer) => unknown[]) {
    const parentFn = this._getArgsFn;
    return new GroupAliasToken<T>(this.token, {
      getArgsFn: (options) => [...parentFn(options), ...fn(options.scope)],
      isLazy: this._isLazy,
      tags: this.getTags(),
    });
  }

  lazy() {
    return new GroupAliasToken<T>(this.token, {
      getArgsFn: this._getArgsFn,
      isLazy: true,
      tags: this.getTags(),
    });
  }

  addTags(...tags: string[]): GroupAliasToken<T> {
    return new GroupAliasToken<T>(this.token, {
      getArgsFn: this._getArgsFn,
      isLazy: this._isLazy,
      tags: [...this.getTags(), ...tags],
    });
  }

  toString(): string {
    return this.token.toString();
  }
}

export const toGroupAlias = <T>(token: DependencyKey) => new GroupAliasToken<T>(token);
