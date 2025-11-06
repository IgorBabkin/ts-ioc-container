import type { IContainer } from '../container/IContainer';
import { InjectionToken, setArgs, TokenOptions } from './InjectionToken';

import { constructor } from '../types';

export class ClassToken<T = any> extends InjectionToken<T> {
  constructor(
    private readonly token: constructor<T>,
    private options: TokenOptions = {},
  ) {
    super();
  }

  resolve(s: IContainer) {
    const argsFn = this.options.argsFn ?? setArgs();
    return s.resolve(this.token, {
      args: argsFn(s),
      lazy: this.options.lazy,
    });
  }

  args(...args: unknown[]): InjectionToken<T> {
    const argsFn = this.options.argsFn ?? setArgs();
    return new ClassToken(this.token, { ...this.options, argsFn: (s) => [...argsFn(s), ...args] });
  }

  argsFn(getArgsFn: (s: IContainer) => unknown[]): InjectionToken<T> {
    const argsFn = this.options.argsFn ?? setArgs();
    return new ClassToken(this.token, { ...this.options, argsFn: (s) => [...argsFn(s), ...getArgsFn(s)] });
  }

  lazy() {
    return new ClassToken(this.token, { ...this.options, lazy: true });
  }
}
