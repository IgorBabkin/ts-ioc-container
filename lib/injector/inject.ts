import { getParameterMetadata, setParameterMetadata } from '../metadata';
import { fillEmptyIndexes, Is } from '../utils';
import { type IContainer } from '../container/IContainer';
import { InjectionToken } from '../token/InjectionToken';
import { ConstantToken } from '../token/ConstantToken';
import { toToken } from '../token/toToken';
import { InjectFn } from '../hooks/hook';
import { constructor } from '../types';

const hookMetaKey = (methodName = 'constructor') => `inject:${methodName}`;

export const inject =
  <T>(fn: InjectionToken<T> | InjectFn<T> | symbol | string | constructor<T>): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    setParameterMetadata(hookMetaKey(propertyKey as string), toToken(fn))(
      Is.instance(target) ? target.constructor : target,
      propertyKey,
      parameterIndex,
    );
  };

export const resolveArgs = (Target: constructor<unknown>, methodName?: string) => {
  const argsTokens = getParameterMetadata(hookMetaKey(methodName), Target) as InjectionToken[];
  return (scope: IContainer, ...deps: unknown[]): unknown[] => {
    const depsTokens = deps.map((v) => new ConstantToken(v));
    const allTokens = fillEmptyIndexes(argsTokens, depsTokens);
    return allTokens.map((fn) => fn.resolve(scope));
  };
};
