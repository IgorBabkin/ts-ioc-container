import type { DependencyKey, IContainer } from '../container/IContainer';
import { InjectionToken, setArgs, TokenOptions } from './InjectionToken';
import { IRegistration } from '../registration/IRegistration';
import { BindToken } from '../registration/BindToken';

export class AliasToken<T = any> extends InjectionToken<T[]> implements BindToken<T> {
  constructor(
    readonly token: string | symbol,
    private options: TokenOptions = {},
  ) {
    super();
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

  args(...args: unknown[]): AliasToken<T> {
    const argsFn = this.options.argsFn ?? setArgs();
    return new AliasToken(this.token, {
      ...this.options,
      argsFn: (s) => [...argsFn(s), ...args],
    });
  }

  argsFn(getArgsFn: (s: IContainer) => unknown[]): AliasToken<T> {
    const argsFn = this.options.argsFn ?? setArgs();
    return new AliasToken(this.token, {
      ...this.options,
      argsFn: (s) => [...argsFn(s), ...getArgsFn(s)],
    });
  }

  lazy(): InjectionToken<T[]> {
    return this;
  }
}

export const toAlias = (token: DependencyKey) => new AliasToken(token);
