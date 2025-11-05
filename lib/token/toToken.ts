import type { InjectFn } from '../hooks/HookContext';
import { DependencyKey } from '../container/IContainer';
import { constructor, Is } from '../utils';
import { StringToken } from './StringToken';
import { ClassToken } from './ClassToken';
import { FunctionToken } from './FunctionToken';
import { UnsupportedTokenTypeError } from '../errors/UnsupportedTokenTypeError';
import { InjectionToken } from './InjectionToken';

export const toToken = <T = any>(
  token: InjectFn<T> | InjectionToken<T> | DependencyKey | constructor<T>,
): InjectionToken<T> => {
  if (token instanceof InjectionToken) {
    return token;
  }

  if (Is.dependencyKey(token)) {
    return new StringToken(token);
  }

  if (Is.constructor(token)) {
    return new ClassToken(token);
  }

  if (typeof token === 'function') {
    return new FunctionToken(token as InjectFn<T>);
  }

  throw new UnsupportedTokenTypeError(`Unknown token ${token}`);
};
