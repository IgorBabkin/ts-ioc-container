import { IInjector, InjectOptions } from './IInjector';
import { IContainer } from '../container/IContainer';
import { constant, constructor, fillEmptyIndexes } from '../utils';
import { setParameterMetadata, getParameterMetadata } from '../metadata';

export type InjectFn<T = unknown> = (l: IContainer) => T;

const METADATA_KEY = 'inject';
export const getInjectFns = (Target: constructor<unknown>, methodName?: string) =>
  getParameterMetadata(metaKey(methodName), Target) as InjectFn[];

const metaKey = (methodName = 'constructor') => `${METADATA_KEY}:${methodName}`;

function isInstance(target: object) {
  return Object.prototype.hasOwnProperty.call(target, 'constructor');
}

export const inject =
  (fn: InjectFn): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    setParameterMetadata(metaKey(propertyKey as string), fn)(
      isInstance(target) ? target.constructor : target,
      propertyKey,
      parameterIndex,
    );
  };

export const resolveArgs = (Target: constructor<unknown>, methodName?: string) => {
  const argsFns = getInjectFns(Target, methodName);
  return (scope: IContainer, ...deps: unknown[]): unknown[] =>
    fillEmptyIndexes(argsFns, deps.map(constant)).map((fn) => fn(scope));
};

export class MetadataInjector implements IInjector {
  resolve<T>(container: IContainer, Target: constructor<T>, { args: deps }: InjectOptions): T {
    const args = resolveArgs(Target)(container, ...deps);
    return new Target(...args);
  }
}
