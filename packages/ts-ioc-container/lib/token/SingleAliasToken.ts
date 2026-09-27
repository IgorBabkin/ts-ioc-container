import { type DependencyKey, type IContainer } from '../container/IContainer';
import { BindableToken } from './BindableToken';
import { type IRegistration } from '../registration/IRegistration';
import { type ResolveOptions } from '../provider/IProvider';

/**
 * Like {@link GroupAliasToken}, but resolves exactly one dependency registered
 * under the alias, and throws `DependencyNotFoundError` when there is none.
 */
export class SingleAliasToken<T = any> extends BindableToken<T> {
  select<R>(fn: (target: T) => R) {
    return (s: IContainer) => fn(this.resolve(s));
  }

  /**
   * @throws {DependencyNotFoundError} when no accessible registration carries the alias.
   */
  resolve(s: IContainer, options?: ResolveOptions): T {
    return s.resolveOneByAlias(this.token, this.toResolveOptions(s, options));
  }

  protected bindKey(r: IRegistration<T>) {
    r.bindToAlias(this.token);
  }
}

/** Creates a {@link SingleAliasToken} for `token`. */
export const toSingleAlias = <T>(token: DependencyKey) => new SingleAliasToken<T>(token);
