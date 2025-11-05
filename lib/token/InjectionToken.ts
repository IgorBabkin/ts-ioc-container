import { DependencyKey, type IContainer, ResolveOneOptions } from '../container/IContainer';
import { type constructor, Is } from '../utils';
import { UnsupportedTokenTypeError } from '../errors/UnsupportedTokenTypeError';
import { type InjectFn } from '../hooks/HookContext';
import { FunctionToken } from './FunctionToken';
import { StringToken } from './StringToken';
import { ClassToken } from './ClassToken';

export abstract class InjectionToken<T = any> {
  abstract resolve(s: IContainer, options?: ResolveOneOptions): T;
  abstract args(...deps: unknown[]): InjectionToken<T>;
  abstract lazy(): InjectionToken<T>;
}

export const toToken = <T = any>(
  token: InjectFn<T> | InjectionToken<T> | DependencyKey | constructor<T>,
): InjectionToken<T> => {
  if (Is.dependencyKey(token)) {
    return new StringToken(token);
  }

  if (Is.constructor(token)) {
    return new ClassToken(token);
  }

  if (typeof token === 'function') {
    return new FunctionToken(token as InjectFn<T>);
  }

  if (token instanceof InjectionToken) {
    return token;
  }

  throw new UnsupportedTokenTypeError(`Unknown token ${token}`);
};
