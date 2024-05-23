import { IContainer } from '../container/IContainer';
import { ExecutionContext } from './ExecutionContext';
import { InjectFn, resolveArgs } from '../injector/MetadataInjector';
import { constructor } from '../utils';

export type Execution<T extends ExecutionContext = ExecutionContext> = (context: T) => void;

export const hook =
  (key: string | symbol, ...fns: Execution[]) =>
  (target: object, propertyKey: string | symbol) => {
    const hooks: Map<string | symbol, Execution[]> = Reflect.hasMetadata(key, target.constructor)
      ? Reflect.getMetadata(key, target.constructor)
      : new Map();
    hooks.set(propertyKey, (hooks.get(propertyKey) ?? []).concat(fns));
    Reflect.defineMetadata(key, hooks, target.constructor); // eslint-disable-line @typescript-eslint/ban-types
  };

export function getHooks(target: object, key: string | symbol): Map<string, Execution[]> {
  return Reflect.hasMetadata(key, target.constructor) ? Reflect.getMetadata(key, target.constructor) : new Map();
}

export function hasHooks(target: object, key: string | symbol): boolean {
  return Reflect.hasMetadata(key, target.constructor);
}

export const executeHooks = <Context extends ExecutionContext>(
  target: object,
  key: string | symbol,
  {
    scope,
    createContext = (c) => c as Context,
  }: { scope: IContainer; createContext?: (c: ExecutionContext) => Context },
) => {
  for (const [methodName, executions] of getHooks(target, key)) {
    for (const execute of executions) {
      execute(createContext(new ExecutionContext(target, methodName, scope)));
    }
  }
};

export const injectProp =
  (fn: InjectFn): Execution =>
  (context) =>
    context.injectProperty(fn);

export const invokeExecution =
  ({
    handleError,
    handleResult,
  }: {
    handleError: (e: Error, s: IContainer) => void;
    handleResult: (result: unknown, context: ExecutionContext) => void;
  }): Execution =>
  (context) => {
    const args = resolveArgs(
      context.instance.constructor as constructor<unknown>,
      context.methodName as string,
    )(context.scope);
    try {
      const result = context.invokeMethod({ args });
      handleResult(result, context);
    } catch (e) {
      handleError(e as Error, context.scope);
    }
  };
