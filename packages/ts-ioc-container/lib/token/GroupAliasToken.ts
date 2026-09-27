import { type DependencyKey, type IContainer } from '../container/IContainer';
import { BindableToken } from './BindableToken';
import { type IRegistration } from '../registration/IRegistration';
import { type ResolveOptions } from '../provider/IProvider';

/**
 * A token for every dependency registered under an alias. As a `@register(...)`
 * target it adds the alias; resolving returns all matches as an array.
 *
 * @example
 * const IMiddlewareToken = toGroupAlias<IMiddleware>('IMiddleware');
 *
 * @register(IMiddlewareToken)
 * class Auth implements IMiddleware {}
 *
 * IMiddlewareToken.resolve(scope); // IMiddleware[]
 */
export class GroupAliasToken<T = any> extends BindableToken<T, T[]> {
  select<R>(fn: (target: T[]) => R[]) {
    return (s: IContainer) => fn(this.resolve(s));
  }

  resolve(s: IContainer, options?: ResolveOptions): T[] {
    return s.resolveByAlias(this.token, this.toResolveOptions(s, options));
  }

  protected bindKey(r: IRegistration<T>) {
    r.bindToAlias(this.token);
  }
}

/** Creates a {@link GroupAliasToken} for `token`. */
export const toGroupAlias = <T>(token: DependencyKey) => new GroupAliasToken<T>(token);
