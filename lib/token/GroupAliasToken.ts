import type { DependencyKey, IContainer } from '../container/IContainer';
import { InjectionToken, setArgs, TokenOptions } from './InjectionToken';
import { IRegistration } from '../registration/IRegistration';
import { BindToken } from './BindToken';

export class GroupAliasToken<T = any> extends InjectionToken<T[]> implements BindToken<T> {
  constructor(
    readonly token: string | symbol,
    private options: TokenOptions = {},
  ) {
    super();
  }

  select<R>(fn: (target: T) => R) {
    return (s: IContainer) => this.resolve(s).map(fn);
  }

  resolve(s: IContainer): T[] {
    const argsFn = this.options.argsFn ?? setArgs();
    return s.resolveByAlias(this.token, {
      args: argsFn(s),
      lazy: this.options.lazy,
    });
  }

  bindTo(r: IRegistration<T>) {
    r.bindToAlias(this.token);
  }

  args(...args: unknown[]): GroupAliasToken<T> {
    const argsFn = this.options.argsFn ?? setArgs();
    return new GroupAliasToken(this.token, {
      ...this.options,
      argsFn: (s) => [...argsFn(s), ...args],
    });
  }

  argsFn(getArgsFn: (s: IContainer) => unknown[]): GroupAliasToken<T> {
    const argsFn = this.options.argsFn ?? setArgs();
    return new GroupAliasToken(this.token, {
      ...this.options,
      argsFn: (s) => [...argsFn(s), ...getArgsFn(s)],
    });
  }

  lazy(): InjectionToken<T[]> {
    return new GroupAliasToken(this.token, {
      ...this.options,
      lazy: true,
    });
  }
}

export const toGroupAlias = <T>(token: DependencyKey) => new GroupAliasToken<T>(token);
