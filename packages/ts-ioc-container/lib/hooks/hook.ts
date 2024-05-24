import { IContainer } from '../container/IContainer';
import { ExecutionContext } from './ExecutionContext';
import { InjectFn } from '../injector/MetadataInjector';
import { promisify } from '../utils';

export type Execution<T extends ExecutionContext = ExecutionContext> = (context: T) => void | Promise<void>;

type HookList = Execution[];
type Hooks = Map<string, HookList>;

export const hook =
  (key: string | symbol, ...fns: HookList) =>
  (target: object, propertyKey: string | symbol) => {
    const hooks: Hooks = Reflect.hasMetadata(key, target.constructor)
      ? Reflect.getMetadata(key, target.constructor)
      : new Map();
    hooks.set(propertyKey as string, (hooks.get(propertyKey as string) ?? []).concat(fns));
    Reflect.defineMetadata(key, hooks, target.constructor); // eslint-disable-line @typescript-eslint/ban-types
  };

export function getHooks(target: object, key: string | symbol): Hooks {
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
    decorateContext = (c) => c as Context,
    handleError,
  }: {
    scope: IContainer;
    decorateContext?: (c: ExecutionContext) => Context;
    handleError: (e: Error, s: IContainer) => void;
  },
) => {
  const hooks = Array.from(getHooks(target, key).entries());
  const createContext = (methodName: string) => decorateContext(new ExecutionContext(target, methodName, scope));
  const runExecution = (execute: Execution, context: Context) =>
    promisify(execute(context)).catch((e) => handleError(e, scope));

  return Promise.all(
    hooks.flatMap(([methodName, executions]) =>
      executions.map((execute) => runExecution(execute, createContext(methodName))),
    ),
  );
};

export const injectProp =
  (fn: InjectFn): Execution =>
  (context) =>
    context.injectProperty(fn);

type HandleResult = (result: unknown, context: ExecutionContext) => void | Promise<void>;
export const invokeExecution =
  ({ handleResult }: { handleResult: HandleResult }): Execution =>
  async (context) => {
    const args = await Promise.all(context.resolveArgs().map(promisify));
    return handleResult(context.invokeMethod({ args }), context);
  };
