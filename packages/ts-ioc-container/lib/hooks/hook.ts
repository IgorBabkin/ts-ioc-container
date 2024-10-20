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
    predicate = () => true,
  }: {
    scope: IContainer;
    createContext?: typeof createHookContext;
    predicate?: (methodName: string) => boolean;
  },
) => {
  const hooks = Array.from(getHooks(target, key).entries()).filter(([methodName]) => predicate(methodName));

  for (const [methodName, executions] of hooks) {
    for (const execute of executions) {
      execute(createContext(target, scope, methodName));
    }
  }
};

export const runHooksAsync = (
  target: object,
  key: string | symbol,
  {
    scope,
    createContext = createHookContext,
    predicate = () => true,
  }: {
    scope: IContainer;
    createContext?: typeof createHookContext;
    predicate?: (methodName: string) => boolean;
  },
) => {
  const hooks = Array.from(getHooks(target, key).entries()).filter(([methodName]) => predicate(methodName));
  const runExecution = (execute: Hook, context: IHookContext) => promisify(execute(context));

  return Promise.all(
    hooks.flatMap(([methodName, executions]) => {
      const context = createContext(target, scope, methodName);
      return executions.map((execute) => runExecution(execute, context));
    }),
  );
};

export const injectProp =
  (fn: InjectFn): Hook =>
  (context) =>
    context.setProperty(fn);
