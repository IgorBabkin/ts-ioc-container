import { IInjector, InjectOptions, Injector } from './IInjector';
import { type constructor, type Instance } from '../utils/basic';
import { resolveConstructor } from '../metadata/target';
import { addParamMeta, getParamMeta } from '../metadata/parameter';
import { ProviderOptions } from '../provider/IProvider';
import { InjectFn } from '../hooks/hook';

export class MetadataInjector extends Injector implements IInjector {
  protected createInstance<T>(Target: constructor<T>, { scope, args: deps = [] }: InjectOptions): T {
    const args = resolveArgs(Target)({ scope, args: deps });
    return new Target(...args);
  }
}

const hookMetaKey = (methodName = 'constructor') => `inject:${methodName}`;

/**
 * Injects a dependency into a constructor parameter.
 *
 * `fn` receives the resolution context - the `scope` the instance is built in and
 * the runtime `args` it is built with - and returns the value to inject. That is
 * the whole contract: a token is resolved by calling it, `({ scope, args }) =>
 * Token.resolve(scope, { args })`, and a mapped value is `pipe(fn, ...mappers)`.
 */
export function inject<T>(fn: InjectFn<T>): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    addParamMeta(hookMetaKey(propertyKey as string), () => fn)(resolveConstructor(target), propertyKey, parameterIndex);
  };
}

export const argsFn =
  <T = unknown>(predicate: (value: unknown, index: number) => boolean): InjectFn<T> =>
  ({ args = [] }): T =>
    args.find((value, index) => predicate(value, index)) as T;

export const arg = <T = unknown>(index: number): InjectFn<T> => argsFn<T>((value, i) => i === index);

export const args: InjectFn<unknown[]> = ({ args = [] }) => args;

/**
 * Resolves the arguments annotated with `@inject` on `target`'s constructor, or on
 * its `methodName` method, by calling each parameter's `InjectFn` with `options`.
 *
 * `target` is the class or any instance of it - a proxy included, since it is
 * unwrapped on the way to the metadata (see {@link resolveConstructor}).
 */
export const resolveArgs = (target: constructor<unknown> | Instance, methodName?: string) => {
  const fns = getParamMeta(hookMetaKey(methodName), target) as InjectFn[];
  return (options: ProviderOptions): unknown[] => fns.map((fn) => fn(options));
};
