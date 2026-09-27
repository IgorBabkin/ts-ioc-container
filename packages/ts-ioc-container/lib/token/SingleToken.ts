import { type IContainer } from '../container/IContainer';
import { BindableToken } from './BindableToken';
import { type IRegistration } from '../registration/IRegistration';
import { type ResolveOptions } from '../provider/IProvider';

/**
 * A typed handle for one dependency key - the usual way to name a dependency.
 * `args(...)`, `argsFn(...)` and `lazy()` return a new token and never change
 * this one, so one token can be specialized per injection site.
 *
 * @example
 * const ILoggerToken = new SingleToken<ILogger>('ILogger');
 *
 * @register(ILoggerToken)
 * class Logger implements ILogger {}
 *
 * class App {
 *   constructor(@inject(by(ILoggerToken)) logger: ILogger) {}
 * }
 * ILoggerToken.resolve(scope);
 * ILoggerToken.args('prefix').lazy().resolve(scope);
 */
export class SingleToken<T = any> extends BindableToken<T> {
  select<R>(fn: (target: T) => R) {
    return (s: IContainer) => fn(this.resolve(s));
  }

  resolve(s: IContainer, options?: ResolveOptions): T {
    return s.resolve(this.token, this.toResolveOptions(s, options));
  }

  protected bindKey(r: IRegistration<T>) {
    r.bindToKey(this.token);
  }
}
