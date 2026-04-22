import { type IHookContext } from './HookContext';
import type { IContainer } from '../container/IContainer';
import { type constructor, Is } from '../utils/basic';
import { getProxyTarget, isProxy } from '../utils/proxy';
import { ProviderOptions } from '../provider/IProvider';

export type InjectFn<T = unknown> = (s: IContainer, options: ProviderOptions) => T;

// HookFn
export type HookFn<T extends IHookContext = IHookContext> = (context: T) => void | Promise<void>;

// HookClass
export interface HookClass<T extends IHookContext = IHookContext> {
  execute(context: Omit<T, 'scope'>): void | Promise<void>;
}

// HooksOfClass
export type HooksOfClass = Map<string, (HookFn | constructor<HookClass>)[]>;

const isHookClassConstructor = <C extends IHookContext>(
  execute: HookFn<C> | constructor<HookClass<C>>,
): execute is constructor<HookClass<C>> => {
  return Is.constructor(execute) && execute.prototype.execute;
};

export const toHookFn = <C extends IHookContext>(execute: HookFn<C> | constructor<HookClass<C>>): HookFn<C> =>
  isHookClassConstructor(execute) ? (context) => context.scope.resolve(execute).execute(context) : execute;

const getReflectionTarget = (target: object) => {
  return isProxy(target) ? getProxyTarget(target) : target;
};

// Get hooks metadata
export function getHooks(target: object, key: string | symbol): HooksOfClass {
  const reflectionTarget = getReflectionTarget(target);
  return Reflect.hasMetadata(key, reflectionTarget.constructor)
    ? Reflect.getMetadata(key, reflectionTarget.constructor)
    : new Map();
}

export function hasHooks(target: object, key: string | symbol): boolean {
  const reflectionTarget = getReflectionTarget(target);
  return Reflect.hasMetadata(key, reflectionTarget.constructor);
}

// Hook decorator
export const hook =
  (key: string | symbol, ...fns: (HookFn | constructor<HookClass>)[]) =>
  (target: object, propertyKey: string | symbol) => {
    const hooks: HooksOfClass = Reflect.hasMetadata(key, target.constructor)
      ? Reflect.getMetadata(key, target.constructor)
      : new Map();
    hooks.set(propertyKey as string, (hooks.get(propertyKey as string) ?? []).concat(fns));
    Reflect.defineMetadata(key, hooks, target.constructor);
  };
