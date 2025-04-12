import { getParameterMetadata, setParameterMetadata } from '../metadata';
import { constant, type constructor, fillEmptyIndexes, isConstructor, isInstance } from '../utils';
import { DependencyKey, type IContainer, isDependencyKey } from '../container/IContainer';
import { hookMetaKey, type InjectFn } from '../hooks/HookContext';
import { type IInjectFnResolver } from './IInjector';

export const inject =
  <T>(fn: InjectFn<T> | IInjectFnResolver<T> | DependencyKey | constructor<T>): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    setParameterMetadata(hookMetaKey(propertyKey as string), toInjectFn(fn))(
      isInstance(target) ? target.constructor : target,
      propertyKey,
      parameterIndex,
    );
  };

function isInjectBuilder<T>(fn: object): fn is IInjectFnResolver<T> {
  return 'resolve' in fn && typeof fn['resolve'] === 'function';
}

export const toInjectFn = <T>(
  target: InjectFn<T> | IInjectFnResolver<T> | DependencyKey | constructor<T>,
): InjectFn<T> => {
  if (typeof target === 'object' && isInjectBuilder(target)) {
    return (s) => target.resolve(s);
  }

  if (isDependencyKey(target) || isConstructor(target)) {
    return (scope, ...args: unknown[]) => scope.resolveOne(target, { args });
  }

  return target;
};

export const resolveArgs = (Target: constructor<unknown>, methodName?: string) => {
  const argsFns = getInjectFns(Target, methodName);
  return (scope: IContainer, ...deps: unknown[]): unknown[] =>
    fillEmptyIndexes(argsFns, deps.map(constant)).map((fn) => fn(scope));
};

const getInjectFns = (Target: constructor<unknown>, methodName?: string) =>
  getParameterMetadata(hookMetaKey(methodName), Target) as InjectFn[];
