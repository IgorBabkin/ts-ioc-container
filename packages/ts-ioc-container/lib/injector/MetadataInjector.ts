import { IInjector } from './IInjector';
import { IContainer } from '../container/IContainer';
import { constant, constructor, fillEmptyIndexes } from '../utils';
import { setParameterMetadata, getParameterMetadata } from '../metadata';

type InjectFn<T = unknown> = (l: IContainer, ...args: unknown[]) => T;

const METADATA_KEY = 'inject';
const getInjectFns = (Target: constructor<unknown>) => getParameterMetadata(METADATA_KEY, Target) as InjectFn[];
export const inject = (fn: InjectFn): ParameterDecorator => setParameterMetadata(METADATA_KEY, fn);

export class MetadataInjector implements IInjector {
  resolve<T>(container: IContainer, Target: constructor<T>, ...deps: unknown[]): T {
    const injectionFns = getInjectFns(Target);
    const args = fillEmptyIndexes(injectionFns, deps.map(constant)).map((fn) => fn(container));
    return new Target(...args);
  }
}
