import { getParameterMetadata, setParameterMetadata } from '../metadata';
import { constant, type constructor, fillEmptyIndexes, isInstance } from '../utils';
import { type IContainer } from '../container/IContainer';
import { hookMetaKey, type InjectFn } from '../hooks/HookContext';
import { type DepKey } from '../DepKey';
import { type IInjectFnResolver } from './IInjector';

export const inject =
  <T>(fn: InjectFn<T> | DepKey<T> | IInjectFnResolver<T>): ParameterDecorator =>
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

export const toInjectFn = <T>(fn: InjectFn<T> | IInjectFnResolver<T>): InjectFn<T> =>
  isInjectBuilder(fn) ? (scope) => fn.resolve(scope) : (fn as InjectFn<T>);

export const resolveArgs = (Target: constructor<unknown>, methodName?: string) => {
  const argsFns = getInjectFns(Target, methodName);
  return (scope: IContainer, ...deps: unknown[]): unknown[] =>
    fillEmptyIndexes(argsFns, deps.map(constant)).map((fn) => fn(scope));
};

const getInjectFns = (Target: constructor<unknown>, methodName?: string) =>
  getParameterMetadata(hookMetaKey(methodName), Target) as InjectFn[];
