import { getParameterMetadata, setParameterMetadata } from '../metadata';
import { constant, constructor, fillEmptyIndexes, isInstance } from '../utils';
import { IContainer } from '../container/IContainer';
import { hookMetaKey, InjectFn } from '../hooks/HookContext';
import { DepKey, isDepKey } from '../DepKey';

export const inject =
  <T>(fn: InjectFn | DepKey<T>): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    setParameterMetadata(hookMetaKey(propertyKey as string), isDepKey(fn) ? fn.resolve : fn)(
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

const getInjectFns = (Target: constructor<unknown>, methodName?: string) =>
  getParameterMetadata(hookMetaKey(methodName), Target) as InjectFn[];
