import type { IContainer } from '../container/IContainer';
import { InjectionToken, setArgs, TokenOptions } from './InjectionToken';
import { type constructor } from '../utils/basic';

export class ClassToken<T = any> extends InjectionToken<T> {
  constructor(
    private readonly token: constructor<T>,
    private options: TokenOptions = {},
  ) {
    super();
  }

  select<R>(fn: (target: T) => R) {
    return (s: IContainer) => fn(this.resolve(s));
  }

  resolve(s: IContainer) {
    const argsFn = this.options.argsFn ?? setArgs();
    return s.resolve(this.token, {
      args: argsFn(s),
      lazy: this.options.lazy,
    });
  }

  args(...args: unknown[]) {
    const argsFn = this.options.argsFn ?? setArgs();
    return new ClassToken(this.token, { ...this.options, argsFn: (s) => [...argsFn(s), ...args] });
  }

  argsFn(getArgsFn: (s: IContainer) => unknown[]) {
    const argsFn = this.options.argsFn ?? setArgs();
    return new ClassToken(this.token, { ...this.options, argsFn: (s) => [...argsFn(s), ...getArgsFn(s)] });
  }

  lazy() {
    return new ClassToken(this.token, { ...this.options, lazy: true });
  }
}
