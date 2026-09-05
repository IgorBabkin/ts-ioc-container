import { IInjector, InjectOptions, Injector } from './IInjector';
import type { IContainer } from '../container/IContainer';
import { type constructor, Is } from '../utils/basic';
import { getParamMeta, addParamMeta } from '../metadata/parameter';
import { InjectionToken } from '../token/InjectionToken';
import { ProviderOptions } from '../provider/IProvider';
import { argToToken, type Injectable, toMappedToken } from '../token/toToken';
import { InjectFn } from '../hooks/hook';
import { type MapFn } from '../utils/fp';

export class MetadataInjector extends Injector implements IInjector {
  protected createInstance<T>(scope: IContainer, Target: constructor<T>, { args: deps = [] }: InjectOptions = {}): T {
    const args = resolveArgs(Target)(scope, { args: deps });
    return new Target(...args);
  }
}

const hookMetaKey = (methodName = 'constructor') => `inject:${methodName}`;

/**
 * Injects a dependency into a constructor parameter.
 *
 * Every argument after the first is a mapper applied to the resolved instance, left to right —
 * `@inject('key', sanitize(), validate())` passes the resolved instance through `sanitize()`,
 * then through `validate()`, and injects the result.
 */
export function inject<T>(fn: Injectable<T>): ParameterDecorator;
export function inject<T, B>(fn: Injectable<T>, fn1: MapFn<T, B>): ParameterDecorator;
export function inject<T, B, C>(fn: Injectable<T>, fn1: MapFn<T, B>, fn2: MapFn<B, C>): ParameterDecorator;
export function inject<T, B, C, D>(
  fn: Injectable<T>,
  fn1: MapFn<T, B>,
  fn2: MapFn<B, C>,
  fn3: MapFn<C, D>,
): ParameterDecorator;
export function inject<T, B, C, D, E>(
  fn: Injectable<T>,
  fn1: MapFn<T, B>,
  fn2: MapFn<B, C>,
  fn3: MapFn<C, D>,
  fn4: MapFn<D, E>,
): ParameterDecorator;
export function inject<T, B, C, D, E, F>(
  fn: Injectable<T>,
  fn1: MapFn<T, B>,
  fn2: MapFn<B, C>,
  fn3: MapFn<C, D>,
  fn4: MapFn<D, E>,
  fn5: MapFn<E, F>,
): ParameterDecorator;
// Fallback for spreads or variable length chains (same type)
export function inject<T>(fn: Injectable<T>, ...mappers: MapFn<T>[]): ParameterDecorator;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function inject<T>(fn: Injectable<T>, ...mappers: MapFn<any, any>[]): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    addParamMeta(hookMetaKey(propertyKey as string), () => toMappedToken(fn, mappers))(
      Is.instance(target) ? target.constructor : target,
      propertyKey,
      parameterIndex,
    );
  };
}

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
