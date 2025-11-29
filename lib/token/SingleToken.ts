import type { IContainer } from '../container/IContainer';
import { InjectionToken, setArgs, TokenOptions } from './InjectionToken';
import { IRegistration } from '../registration/IRegistration';

export class SingleToken<T = any> extends InjectionToken {
  constructor(
    public token: string | symbol,
    private options: TokenOptions = {},
  ) {
    super();
  }

  resolve(s: IContainer): T {
    const argsFn = this.options.argsFn ?? setArgs();
    return s.resolve(this.token, {
      args: argsFn(s),
      lazy: this.options.lazy,
    });
  }

  bindTo(r: IRegistration<T>) {
    r.bindToKey(this.token);
  }

  args(...args: unknown[]): SingleToken<T> {
    const argsFn = this.options.argsFn ?? setArgs();
    return new SingleToken(this.token, {
      ...this.options,
      argsFn: (s) => [...argsFn(s), ...args],
    });
  }

  argsFn(getArgsFn: (s: IContainer) => unknown[]): SingleToken<T> {
    const argsFn = this.options.argsFn ?? setArgs();
    return new SingleToken(this.token, {
      ...this.options,
      argsFn: (s) => [...argsFn(s), ...getArgsFn(s)],
    });
  }

  lazy(): SingleToken<T> {
    return new SingleToken(this.token, { ...this.options, lazy: true });
  }
}
