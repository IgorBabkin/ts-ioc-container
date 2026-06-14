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

// Walk the constructor's prototype chain (most-derived first) collecting each class.
const getConstructorChain = (ctor: unknown): object[] => {
  const chain: object[] = [];
  let current = ctor;
  while (typeof current === 'function' && current !== Function.prototype) {
    chain.push(current);
    current = Object.getPrototypeOf(current);
  }
  return chain;
};

// Get hooks metadata, merging hooks declared on parent (extended-from) classes.
// Hooks are collected from base to derived so a derived class's hooks for the same
// method name take precedence over (replace) the parent's.
export function getHooks(target: object, key: string | symbol): HooksOfClass {
  const reflectionTarget = getReflectionTarget(target);
  const merged: HooksOfClass = new Map();
  for (const ctor of getConstructorChain(reflectionTarget.constructor).reverse()) {
    const ownHooks: HooksOfClass | undefined = Reflect.getOwnMetadata(key, ctor);
    if (ownHooks) {
      for (const [methodName, fns] of ownHooks) {
        merged.set(methodName, fns);
      }
    }
  }
  return merged;
}

export function hasHooks(target: object, key: string | symbol): boolean {
  const reflectionTarget = getReflectionTarget(target);
  return getConstructorChain(reflectionTarget.constructor).some((ctor) => Reflect.hasOwnMetadata(key, ctor));
}

// Hook decorator
export const hook =
  (key: string | symbol, ...fns: (HookFn | constructor<HookClass>)[]) =>
  (target: object, propertyKey: string | symbol) => {
    const hooks: HooksOfClass = Reflect.hasOwnMetadata(key, target.constructor)
      ? Reflect.getOwnMetadata(key, target.constructor)
      : new Map();
    hooks.set(propertyKey as string, (hooks.get(propertyKey as string) ?? []).concat(fns));
    Reflect.defineMetadata(key, hooks, target.constructor);
  };
