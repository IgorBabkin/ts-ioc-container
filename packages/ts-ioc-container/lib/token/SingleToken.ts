import { DependencyKey, IContainer } from '../container/IContainer';
import { forwardArgs, InjectionToken } from './InjectionToken';
import { IRegistration } from '../registration/IRegistration';
import { ArgsFn, ResolveOptions } from '../provider/IProvider';
import { Serializable } from '../utils/basic';

/**
 * A typed handle for one dependency key - the usual way to name a dependency.
 * `args(...)`, `argsFn(...)` and `lazy()` return a new token and never change
 * this one, so one token can be specialized per injection site.
 *
 * @example
 * const ILoggerToken = new SingleToken<ILogger>('ILogger');
 *
 * @register(bindTo(ILoggerToken))
 * class Logger implements ILogger {}
 *
 * class App {
 *   constructor(@inject(by(ILoggerToken)) logger: ILogger) {}
 * }
 * ILoggerToken.resolve(scope);
 * ILoggerToken.args('prefix').lazy().resolve(scope);
 */
export class SingleToken<T = any> extends InjectionToken<T> implements Serializable {
  private readonly _getArgsFn: ArgsFn;
  private readonly _isLazy: boolean;

  constructor(
    public token: DependencyKey,
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

  resolve(s: IContainer, { args = [], lazy }: ResolveOptions = {}): T {
    return s.resolve(this.token, {
      args: this._getArgsFn({ scope: s, args }),
      lazy: this._isLazy || lazy,
    });
  }

  bindTo(r: IRegistration<T>) {
    r.bindToKey(this.token);
  }

  args(...newArgs: unknown[]) {
    const parentFn = this._getArgsFn;
    return new SingleToken<T>(this.token, {
      getArgsFn: (options) => [...parentFn(options), ...newArgs],
      isLazy: this._isLazy,
      tags: this.getTags(),
    });
  }

  argsFn(fn: (s: IContainer) => unknown[]) {
    const parentFn = this._getArgsFn;
    return new SingleToken<T>(this.token, {
      getArgsFn: (options) => [...parentFn(options), ...fn(options.scope)],
      isLazy: this._isLazy,
      tags: this.getTags(),
    });
  }

  lazy() {
    return new SingleToken<T>(this.token, {
      getArgsFn: this._getArgsFn,
      isLazy: true,
      tags: this.getTags(),
    });
  }

  addTags(...tags: string[]): SingleToken<T> {
    return new SingleToken<T>(this.token, {
      getArgsFn: this._getArgsFn,
      isLazy: this._isLazy,
      tags: [...this.getTags(), ...tags],
    });
  }

  toString(): string {
    return this.token.toString();
  }
}
