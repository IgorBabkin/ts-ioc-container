import { DependencyKey, isDependencyKey } from '../container/IContainer';
import { SingleToken } from './SingleToken';
import { ClassToken } from './ClassToken';
import { FunctionToken } from './FunctionToken';
import { UnsupportedTokenTypeError } from '../errors/UnsupportedTokenTypeError';
import { InjectionToken, isInjectionToken } from './InjectionToken';
import { InjectFn } from '../hooks/hook';
import { type constructor, Is } from '../utils/basic';
import { ConstantToken } from './ConstantToken';
import { type MapFn, pipe } from '../utils/fp';

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

export const argToToken = (v: unknown): InjectionToken<unknown> => (isInjectionToken(v) ? v : new ConstantToken(v));

/**
 * Builds a token that resolves `token` and then pipes the resolved instance through `mappers`,
 * left to right. With no mappers the instance is passed through untouched.
 * @throws {UnsupportedTokenTypeError} when `token` is not an `InjectionToken`, a `DependencyKey`, a constructor, or a function.
 */
export const toMappedToken = <T = any, R = T>(token: Injectable<T>, mappers: MapFn<any, any>[]): InjectionToken<R> => {
  const source = toToken<T>(token);
  const mapInstance = pipe<any>(...mappers);
  return new FunctionToken<R>((scope, options) => mapInstance(source.resolve(scope, options)));
};
