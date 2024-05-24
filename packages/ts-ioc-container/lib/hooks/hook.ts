import { IContainer } from '../container/IContainer';
import { createHookContext, IHookContext, InjectFn } from './HookContext';
import { promisify } from '../utils';

export type Hook<T extends IHookContext = IHookContext> = (context: T) => void | Promise<void>;

type HooksOfClass = Map<string, Hook[]>;

export const hook =
  (key: string | symbol, ...fns: Hook[]) =>
  (target: object, propertyKey: string | symbol) => {
    const hooks: HooksOfClass = Reflect.hasMetadata(key, target.constructor)
      ? Reflect.getMetadata(key, target.constructor)
      : new Map();
    hooks.set(propertyKey as string, (hooks.get(propertyKey as string) ?? []).concat(fns));
    Reflect.defineMetadata(key, hooks, target.constructor); // eslint-disable-line @typescript-eslint/ban-types
  };

export function getHooks(target: object, key: string | symbol): HooksOfClass {
  return Reflect.hasMetadata(key, target.constructor) ? Reflect.getMetadata(key, target.constructor) : new Map();
}

export function hasHooks(target: object, key: string | symbol): boolean {
  return Reflect.hasMetadata(key, target.constructor);
}

export const runHooks = (
  target: object,
  key: string | symbol,
  {
    scope,
    createContext = createHookContext,
    handleError,
  }: {
    scope: IContainer;
    createContext?: typeof createHookContext;
    handleError: (e: Error, s: IContainer) => void;
  },
) => {
  const hooks = Array.from(getHooks(target, key).entries());
  const runExecution = (execute: Hook, context: IHookContext) =>
    promisify(execute(context)).catch((e) => handleError(e, scope));

  return Promise.all(
    hooks.flatMap(([methodName, executions]) =>
      executions.map((execute) => runExecution(execute, createContext(target, scope, methodName))),
    ),
  );
};

export const injectProp =
  (fn: InjectFn): Hook =>
  (context) =>
    context.injectProperty(fn);

type HandleResult = (result: unknown, context: IHookContext) => void | Promise<void>;
export const invokeExecution =
  ({ handleResult }: { handleResult: HandleResult }): Hook =>
  async (context) => {
    const args = await Promise.all(context.resolveArgs().map(promisify));
    return handleResult(context.invokeMethod({ args }), context);
  };

/**
 * @deprecated Use `runHooks` instead
 * @TODO: Remove in v33
 */
export const executeHooks = runHooks;
