import { IInjector } from './IInjector';
import { IContainer } from '../container/IContainer';
import { constant, constructor, fillEmptyIndexes } from '../utils';
import { setParameterMetadata, getParameterMetadata } from '../metadata';

type InjectFn<T = unknown> = (l: IContainer, ...args: unknown[]) => T;

const INJECT_FN_LIST_KEY = 'INJECT_FN_LIST';

export const inject = (fn: InjectFn): ParameterDecorator => setParameterMetadata(INJECT_FN_LIST_KEY, fn);

export class ReflectionInjector implements IInjector {
  resolve<T>(container: IContainer, Target: constructor<T>, ...deps: unknown[]): T {
    const injectionFns = getParameterMetadata(INJECT_FN_LIST_KEY, Target) as InjectFn[];
    const args = fillEmptyIndexes(injectionFns, deps.map(constant)).map((fn) => fn(container));
    return new Target(...args);
  }
}
