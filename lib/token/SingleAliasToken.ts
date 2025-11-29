import type { DependencyKey, IContainer } from '../container/IContainer';
import { InjectionToken, setArgs, TokenOptions } from './InjectionToken';
import { IRegistration } from '../registration/IRegistration';
import { BindToken } from './BindToken';

export class SingleAliasToken<T = any> extends InjectionToken<T> implements BindToken<T> {
  constructor(
    readonly token: string | symbol,
    private options: TokenOptions = {},
  ) {
    super();
  }

  resolve(s: IContainer): T {
    const argsFn = this.options.argsFn ?? setArgs();
    return s.resolveOneByAlias(this.token, {
      args: argsFn(s),
      lazy: this.options.lazy,
    });
  }

  bindTo(r: IRegistration<T>) {
    r.bindToAlias(this.token);
  }

  args(...args: unknown[]): InjectionToken<T> {
    const argsFn = this.options.argsFn ?? setArgs();
    return new SingleAliasToken(this.token, {
      ...this.options,
      argsFn: (s) => [...argsFn(s), ...args],
    });
  }

  argsFn(getArgsFn: (s: IContainer) => unknown[]): InjectionToken<T> {
    const argsFn = this.options.argsFn ?? setArgs();
    return new SingleAliasToken(this.token, {
      ...this.options,
      argsFn: (s) => [...argsFn(s), ...getArgsFn(s)],
    });
  }

  lazy(): InjectionToken<T> {
    return this;
  }
}

export const toSingleAlias = <T>(token: DependencyKey) => new SingleAliasToken<T>(token);
