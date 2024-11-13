import { IContainer } from '../container/IContainer';
import { CreateHookContext, createHookContext, IHookContext, InjectFn } from './HookContext';
import { constructor, isConstructor, promisify } from '../utils';
import { UnexpectedHookResultError } from '../errors/UnexpectedHookResultError';

export type HookFn<T extends IHookContext = IHookContext> = (context: T) => void | Promise<void>;
export interface HookClass<T extends IHookContext = IHookContext> {
  execute(context: Omit<T, 'scope'>): void | Promise<void>;
}
const isHookClassConstructor = (execute: HookFn | constructor<HookClass>): execute is constructor<HookClass> => {
  return isConstructor(execute) && execute.prototype.execute;
};

type HooksOfClass = Map<string, (HookFn | constructor<HookClass>)[]>;

export const hook =
  (key: string | symbol, ...fns: (HookFn | constructor<HookClass>)[]) =>
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
    createContext?: CreateHookContext;
    predicate?: (methodName: string) => boolean;
  },
) => {
  const hooks = Array.from(getHooks(target, key).entries()).filter(([methodName]) => predicate(methodName));

  for (const [methodName, executions] of hooks) {
    for (const execute of executions) {
      const context = createContext(target, scope, methodName);
      const result = isHookClassConstructor(execute) ? scope.resolve(execute).execute(context) : execute(context);
      if (result instanceof Promise) {
        throw new UnexpectedHookResultError(`Hook ${methodName} returned a promise, use runHooksAsync instead`);
      }
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
  const runExecution = (execute: HookFn | constructor<HookClass>, context: IHookContext) =>
    isHookClassConstructor(execute)
      ? promisify(context.scope.resolve(execute).execute(context))
      : promisify(execute(context));

  return Promise.all(
    hooks.flatMap(([methodName, executions]) => {
      const context = createContext(target, scope, methodName);
      return executions.map((execute) => runExecution(execute, context));
    }),
  );
};

export const injectProp =
  (fn: InjectFn): HookFn =>
  (context) =>
    context.setProperty(fn);

export const onConstruct = (fn: HookFn) => hook('onConstruct', fn);
export const runOnConstructHooks = (target: object, scope: IContainer) => runHooks(target, 'onConstruct', { scope });
export const onDispose = hook('onDispose', (context) => {
  context.invokeMethod({});
});
export const runOnDisposeHooks = (target: object, scope: IContainer) => runHooks(target, 'onDispose', { scope });
