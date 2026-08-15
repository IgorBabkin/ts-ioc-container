import { IInjector, InjectOptions, Injector } from './IInjector';
import type { IContainer } from '../container/IContainer';
import { type constructor, Is } from '../utils/basic';
import { getParamMeta, addParamMeta } from '../metadata/parameter';
import { InjectionToken } from '../token/InjectionToken';
import { ProviderOptions } from '../provider/IProvider';
import { argToToken, toToken } from '../token/toToken';
import { FunctionToken } from '../token/FunctionToken';
import { InjectFn } from '../hooks/hook';

export class MetadataInjector extends Injector implements IInjector {
  protected createInstance<T>(scope: IContainer, Target: constructor<T>, { args: deps = [] }: InjectOptions = {}): T {
    const args = resolveArgs(Target)(scope, { args: deps });
    return new Target(...args);
  }
}

const hookMetaKey = (methodName = 'constructor') => `inject:${methodName}`;

export const inject =
  <T, R = T>(
    fn: InjectionToken<T> | InjectFn<T> | symbol | string | constructor<T>,
    // selectFn narrows the resolved instance before it reaches the constructor parameter.
    selectFn: (instance: T) => R = (instance) => instance as unknown as R,
  ): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    const toSelectedToken = () => {
      const token = toToken(fn);
      return new FunctionToken<R>((scope, options) => selectFn(token.resolve(scope, options)));
    };
    addParamMeta(hookMetaKey(propertyKey as string), toSelectedToken)(
      Is.instance(target) ? target.constructor : target,
      propertyKey,
      parameterIndex,
    );
  };

export const argsFn =
  <T = unknown>(predicate: (value: unknown, index: number) => boolean): InjectFn<T> =>
  (c, { args = [] }): T =>
    args.find((value, index) => predicate(value, index)) as T;

export const args = <T = unknown>(index: number): InjectFn<T> => argsFn<T>((value, i) => i === index);

export const resolveArgs = (Target: constructor<unknown>, methodName?: string) => {
  const tokens = getParamMeta(hookMetaKey(methodName), Target) as InjectionToken[];
  return (scope: IContainer, { args = [], lazy }: ProviderOptions): unknown[] =>
    tokens.map((fn) => fn.resolve(scope, { args: args.map(argToToken).map((t) => t.resolve(scope)), lazy }));
};
