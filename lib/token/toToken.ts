import { DependencyKey, isDependencyKey } from '../container/IContainer';
import { Is } from '../utils';
import { SingleToken } from './SingleToken';
import { ClassToken } from './ClassToken';
import { FunctionToken } from './FunctionToken';
import { UnsupportedTokenTypeError } from '../errors/UnsupportedTokenTypeError';
import { InjectionToken } from './InjectionToken';
import { InjectFn } from '../hooks/hook';
import { constructor } from '../types';

export const toToken = <T = any>(
  token: InjectFn<T> | InjectionToken<T> | DependencyKey | constructor<T>,
): InjectionToken<T> => {
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
