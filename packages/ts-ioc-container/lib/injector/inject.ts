import { getParameterMetadata, setParameterMetadata } from '../metadata.ts';
import { constant, constructor, fillEmptyIndexes, isInstance } from '../utils.ts';
import { IContainer } from '../container/IContainer.ts';
import { hookMetaKey, InjectFn } from '../hooks/HookContext.ts';

export const inject =
  (fn: InjectFn): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    setParameterMetadata(hookMetaKey(propertyKey as string), fn)(
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
