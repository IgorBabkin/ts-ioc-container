import { getParameterMetadata, setParameterMetadata } from '../metadata';
import { type constructor, fillEmptyIndexes, Is } from '../utils';
import { type IContainer } from '../container/IContainer';
import { hookMetaKey, type InjectFn } from '../hooks/HookContext';
import { InjectionToken, toToken } from '../token/InjectionToken';
import { ConstantToken } from '../token/ConstantToken';

export const inject =
  <T>(fn: InjectFn<T> | InjectionToken<T> | symbol | string | constructor<T>): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    setParameterMetadata(hookMetaKey(propertyKey as string), toToken(fn))(
      Is.instance(target) ? target.constructor : target,
      propertyKey,
      parameterIndex,
    );
  };

export const resolveArgs = (Target: constructor<unknown>, methodName?: string) => {
  const argsTokens = getParameterMetadata(hookMetaKey(methodName), Target) as InjectionToken[];
  return (scope: IContainer, ...deps: unknown[]): unknown[] =>
    fillEmptyIndexes(
      argsTokens,
      deps.map((v) => new ConstantToken(v)),
    ).map((fn) => fn.resolve(scope));
};
