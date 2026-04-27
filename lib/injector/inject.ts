import { type IContainer } from '../container/IContainer';
import { InjectionToken } from '../token/InjectionToken';
import { argToToken, toToken } from '../token/toToken';
import { InjectFn } from '../hooks/hook';
import { type constructor, Is } from '../utils/basic';
import { getParamMeta, paramMeta } from '../metadata/parameter';
import { ProviderOptions } from '../provider/IProvider';

const hookMetaKey = (methodName = 'constructor') => `inject:${methodName}`;

export const inject =
  <T>(fn: InjectionToken<T> | InjectFn<T> | symbol | string | constructor<T>): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    paramMeta(hookMetaKey(propertyKey as string), () => toToken(fn))(
      Is.instance(target) ? target.constructor : target,
      propertyKey,
      parameterIndex,
    );
  };

export const args =
  (index: number): InjectFn =>
  (c, { args = [] }): unknown => {
    return args[index];
  };

export const argsFn =
  <T>(fn: (...args: unknown[]) => T): InjectFn<T> =>
  (c, options) =>
    fn(...(options.args ?? []));

export const resolveArgs = (Target: constructor<unknown>, methodName?: string) => {
  const tokens = getParamMeta(hookMetaKey(methodName), Target) as InjectionToken[];
  return (scope: IContainer, { args = [], lazy }: ProviderOptions): unknown[] =>
    tokens.map((fn) => fn.resolve(scope, { args: args.map(argToToken).map((t) => t.resolve(scope)), lazy }));
};
