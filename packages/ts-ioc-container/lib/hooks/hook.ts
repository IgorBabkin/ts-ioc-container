import { type IHookContext } from './HookContext';
import type { IContainer } from '../container/IContainer';
import { type constructor, Is, type Instance } from '../utils/basic';
import { resolveConstructor } from '../metadata/target';
import { ProviderOptions } from '../provider/IProvider';
import { memoize } from '../utils/memoize';

export type InjectFn<T = unknown> = (s: IContainer, options: ProviderOptions) => T;

// HookFn
export type HookFn<T extends IHookContext = IHookContext> = (context: T) => void | Promise<void>;

// HookClass
export interface HookClass<T extends IHookContext = IHookContext> {
  execute(context: Omit<T, 'scope'>): void | Promise<void>;
}

// HookType - anything that can be registered as a hook: a plain function or a hook class
export type HookType<T extends IHookContext = IHookContext> = HookFn<T> | constructor<HookClass<T>>;

// HooksOfClass - one hook per decorated member; compose several with `sequential`/`parallel`
export type HooksOfClass = Map<string, HookType>;

const isHookClassConstructor = <C extends IHookContext>(
  execute: HookFn<C> | constructor<HookClass<C>>,
): execute is constructor<HookClass<C>> => {
  return Is.constructor(execute) && execute.prototype.execute;
};

export const toHookFn = <C extends IHookContext>(execute: HookFn<C> | constructor<HookClass<C>>): HookFn<C> =>
  isHookClassConstructor(execute) ? (context) => context.scope.resolve(execute).execute(context) : execute;

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

// Hook metadata is fixed once a class is defined - decorators have all run by the time there is
// an instance to read them off - so the merge happens once per class and key.
const mergeHooks = memoize((Target: constructor<unknown>, key: string | symbol): HooksOfClass => {
  const merged: HooksOfClass = new Map();
  for (const ctor of getConstructorChain(Target).reverse()) {
    const ownHooks: HooksOfClass | undefined = Reflect.getOwnMetadata(key, ctor);
    if (ownHooks) {
      for (const [methodName, fn] of ownHooks) {
        merged.set(methodName, fn);
      }
    }
  }
  return merged;
});

// Get hooks metadata, merging hooks declared on parent (extended-from) classes.
// Hooks are collected from base to derived so a derived class's hook for the same
// method name takes precedence over (replaces) the parent's.
//
// `target` is an instance or its class, a proxy of either included - it is normalized
// by `resolveConstructor`, so callers never have to unwrap it themselves.
//
// The map is memoized per class and key and shared with every other caller: read it,
// never mutate it.
export function getHooks(target: Instance | constructor<unknown>, key: string | symbol): HooksOfClass {
  return mergeHooks(resolveConstructor(target), key);
}

// `target` is an instance or its class, a proxy of either included, see {@link getHooks}.
export function hasHooks(target: Instance | constructor<unknown>, key: string | symbol): boolean {
  return getConstructorChain(resolveConstructor(target)).some((ctor) => Reflect.hasOwnMetadata(key, ctor));
}

// Hook decorator
// A member carries exactly one hook per key: decorating the same member twice under the
// same key replaces the earlier hook. Compose several with `sequential(...)`/`parallel(...)`.
export const hook = (key: string | symbol, fn: HookType) => (target: object, propertyKey: string | symbol) => {
  const hooks: HooksOfClass = Reflect.hasOwnMetadata(key, target.constructor)
    ? Reflect.getOwnMetadata(key, target.constructor)
    : new Map();
  hooks.set(propertyKey as string, fn);
  Reflect.defineMetadata(key, hooks, target.constructor);
};
