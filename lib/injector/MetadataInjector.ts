import { IInjector, InjectOptions, Injector } from './IInjector';
import type { IContainer } from '../container/IContainer';
import { type constructor, Is } from '../utils/basic';
import { getParamMeta, paramMeta } from '../metadata/parameter';
import { InjectionToken } from '../token/InjectionToken';
import { ProviderOptions } from '../provider/IProvider';
import { argToToken, toToken } from '../token/toToken';
import { InjectFn } from '../hooks/hook';

export class MetadataInjector extends Injector implements IInjector {
  protected createInstance<T>(scope: IContainer, Target: constructor<T>, { args: deps = [] }: InjectOptions = {}): T {
    const args = resolveArgs(Target)(scope, { args: deps });
    return new Target(...args);
  }
}

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
