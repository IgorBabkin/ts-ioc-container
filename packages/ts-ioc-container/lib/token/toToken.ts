import { DependencyKey, isDependencyKey } from '../container/IContainer';
import { SingleToken } from './SingleToken';
import { ClassToken } from './ClassToken';
import { FunctionToken } from './FunctionToken';
import { UnsupportedTokenTypeError } from '../errors/UnsupportedTokenTypeError';
import { InjectionToken, isInjectionToken } from './InjectionToken';
import { InjectFn } from '../hooks/hook';
import { type constructor, Is } from '../utils/basic';
import { ConstantToken } from './ConstantToken';

export type Injectable<T = any> = InjectFn<T> | InjectionToken<T> | DependencyKey | constructor<T>;

/**
 * @throws {UnsupportedTokenTypeError} when `token` is not an `InjectionToken`, a `DependencyKey`, a constructor, or a function.
 */
export const toToken = <T = any>(token: Injectable<T>): InjectionToken<T> => {
  if (token instanceof InjectionToken) {
    return token;
  }

  if (isDependencyKey(token)) {
    return new SingleToken(token);
  }

  if (Is.constructor(token)) {
    return new ClassToken(token);
  }

  if (typeof token === 'function') {
    return new FunctionToken(token as InjectFn<T>);
  }

  throw new UnsupportedTokenTypeError(`Unknown token ${token}`);
};

/**
 * Wraps a runtime argument so it can be resolved uniformly: an `InjectionToken`
 * is returned as-is, anything else becomes a `ConstantToken` of itself. The
 * library never applies it to the args list - a call site that wants
 * "resolve tokens, pass literals through" does so explicitly, e.g.
 * `@inject(({ scope, args = [] }) => argToToken(args[0]).resolve(scope))`.
 */
export const argToToken = <T = unknown>(v: T): InjectionToken<T> => (isInjectionToken<T>(v) ? v : new ConstantToken(v));
