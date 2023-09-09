import { IInjector } from './IInjector';
import { IContainer, InjectionToken } from '../container/IContainer';
import { constant, constructor, merge } from '../utils';

type InjectFn<T = unknown> = (l: IContainer, ...args: unknown[]) => T;

export const by =
  <T>(key: InjectionToken<T>, ...args: unknown[]) =>
  (c: IContainer) =>
    c.resolve<T>(key, ...args);

const INJECT_KEY = 'INJECT_FN_LIST';

export const inject =
  (value: InjectFn): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    const metadata: InjectFn[] = Reflect.getOwnMetadata(INJECT_KEY, target) ?? [];
    metadata[parameterIndex] = value;
    Reflect.defineMetadata(INJECT_KEY, metadata, target);
  };

export class ReflectionInjector implements IInjector {
  resolve<T>(container: IContainer, Target: constructor<T>, ...deps: unknown[]): T {
    const injectionFns: InjectFn[] = Reflect.getOwnMetadata(INJECT_KEY, Target) ?? [];
    const args = merge(injectionFns, deps.map(constant)).map((fn) => fn(container));
    return new Target(...args);
  }
}
