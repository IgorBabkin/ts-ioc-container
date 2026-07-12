import { IInjector, InjectOptions, Injector } from './IInjector';
import type { IContainer } from '../container/IContainer';
import { type constructor, Is } from '../utils/basic';
import { getParamMeta, addParamMeta } from '../metadata/parameter';
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
    addParamMeta(hookMetaKey(propertyKey as string), () => toToken(fn))(
      Is.instance(target) ? target.constructor : target,
      propertyKey,
      parameterIndex,
    );
  };

export const argsFn =
  <T = unknown>(predicate: (value: unknown, index: number) => boolean): InjectFn<T> =>
  (c, { args = [] }): T =>
    args.find((value, index) => predicate(value, index)) as T;

export const args = (index: number): InjectFn => argsFn((value, i) => i === index);

export const resolveArgs = (Target: constructor<unknown>, methodName?: string) => {
  const tokens = getParamMeta(hookMetaKey(methodName), Target) as InjectionToken[];
  return (scope: IContainer, { args = [], lazy }: ProviderOptions): unknown[] =>
    tokens.map((fn) => fn.resolve(scope, { args: args.map(argToToken).map((t) => t.resolve(scope)), lazy }));
};
