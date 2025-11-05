import { DependencyKey, type IContainer, ResolveOneOptions } from '../container/IContainer';
import { type constructor, Is } from '../utils';
import { UnsupportedTokenTypeError } from '../errors/UnsupportedTokenTypeError';
import { type InjectFn } from '../hooks/HookContext';
import { FunctionToken } from './FunctionToken';
import { StringToken } from './StringToken';
import { ClassToken } from './ClassToken';
import { ArgsFn, WithLazy } from '../provider/IProvider';

export abstract class InjectionToken<T = any> {
  abstract resolve(s: IContainer, options?: ResolveOneOptions): T;
  abstract args(...deps: unknown[]): InjectionToken<T>;
  abstract argsFn(getArgsFn: (s: IContainer) => unknown[]): InjectionToken<T>;
  abstract lazy(): InjectionToken<T>;
}

type WithArgsFn = {
  argsFn: ArgsFn;
};
export type TokenOptions = Partial<WithArgsFn> & Partial<WithLazy>;
export const setArgs =
  (...args: unknown[]): ArgsFn =>
  (s) =>
    args;

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
