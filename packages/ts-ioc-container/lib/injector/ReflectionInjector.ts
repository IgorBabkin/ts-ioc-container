import { IInjector } from './IInjector';
import { IContainer } from '../container/IContainer';
import { constant, constructor, fillEmptyIndexes } from '../utils';
import { setParameterMetadata } from '../metadata';

type InjectFn<T = unknown> = (l: IContainer, ...args: unknown[]) => T;

const INJECT_KEY = 'INJECT_FN_LIST';

export const inject = (value: InjectFn): ParameterDecorator => setParameterMetadata(INJECT_KEY, value);

export class ReflectionInjector implements IInjector {
  resolve<T>(container: IContainer, Target: constructor<T>, ...deps: unknown[]): T {
    const injectionFns: InjectFn[] = Reflect.getOwnMetadata(INJECT_KEY, Target) ?? [];
    const args = fillEmptyIndexes(injectionFns, deps.map(constant)).map((fn) => fn(container));
    return new Target(...args);
  }
}
