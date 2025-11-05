import { DependencyKey, type IContainer } from '../container/IContainer';
import { type CreateHookContext, createHookContext, type IHookContext, type InjectFn } from './HookContext';
import { type constructor, Is, promisify } from '../utils';
import { UnexpectedHookResultError } from '../errors/UnexpectedHookResultError';
import { type IInjectFnResolver } from '../injector/IInjector';
import { toToken } from '../token/InjectionToken';

export type HookFn<T extends IHookContext = IHookContext> = (context: T) => void | Promise<void>;
export interface HookClass<T extends IHookContext = IHookContext> {
  execute(context: Omit<T, 'scope'>): void | Promise<void>;
}
const isHookClassConstructor = <C extends IHookContext>(
  execute: HookFn<C> | constructor<HookClass<C>>,
): execute is constructor<HookClass<C>> => {
  return Is.constructor(execute) && execute.prototype.execute;
};

export const toHookFn = <C extends IHookContext>(execute: HookFn<C> | constructor<HookClass<C>>): HookFn<C> =>
  isHookClassConstructor(execute) ? (context) => context.scope.resolveOne(execute).execute(context) : execute;

type HooksOfClass = Map<string, (HookFn | constructor<HookClass>)[]>;

export const hook =
  (key: string | symbol, ...fns: (HookFn | constructor<HookClass>)[]) =>
  (target: object, propertyKey: string | symbol) => {
    const hooks: HooksOfClass = Reflect.hasMetadata(key, target.constructor)
      ? Reflect.getMetadata(key, target.constructor)
      : new Map();
    hooks.set(propertyKey as string, (hooks.get(propertyKey as string) ?? []).concat(fns));
    Reflect.defineMetadata(key, hooks, target.constructor);
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

  const runMethodHooks = (methodName: string, executions: HookFn[]) => {
    const context = createContext(target, scope, methodName);
    for (const execute of executions) {
      const result = execute(context);
      if (result instanceof Promise) {
        throw new UnexpectedHookResultError(`Hook ${methodName} returned a promise, use runHooksAsync instead`);
      }
    }
  };

  for (const [methodName, executions] of hooks) {
    runMethodHooks(methodName, executions.map(toHookFn));
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

  const runMethodHooks = async (methodName: string, executions: HookFn[]) => {
    const context = createContext(target, scope, methodName);
    for (const execute of executions) {
      await promisify(execute(context));
    }
  };

  return Promise.all(hooks.map(([methodName, executions]) => runMethodHooks(methodName, executions.map(toHookFn))));
};

export const injectProp =
  (fn: InjectFn | IInjectFnResolver<unknown> | DependencyKey | constructor<unknown>): HookFn =>
  (context) =>
    context.setProperty(toToken(fn));

export const onConstruct = (fn: HookFn) => hook('onConstruct', fn);
export const runOnConstructHooks = (target: object, scope: IContainer) => runHooks(target, 'onConstruct', { scope });

export const onDispose = hook('onDispose', (context) => {
  context.invokeMethod({});
});
export const runOnDisposeHooks = (target: object, scope: IContainer) => runHooks(target, 'onDispose', { scope });
