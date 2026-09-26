import { type IHookContext } from './HookContext';
import { type constructor, type Instance, Is } from '../utils/basic';
import { resolveConstructor } from '../metadata/target';
import { getConstructorChain } from '../utils/getConstructorChain';
import { ProviderOptions } from '../provider/IProvider';

/**
 * What `@inject(...)` and `injectProp(...)` take: a function of the resolution
 * context returning the value to inject. Usually built with `by(...)` or `arg(...)`.
 */
export type InjectFn<T = unknown> = (options: ProviderOptions) => T;

/** A hook as a function of its context. Must return `void` or `Promise<void>`. */
export type HookFn<T extends IHookContext = IHookContext> = (context: T) => void | Promise<void>;

/** A hook as a class resolved from the scope; its `execute` receives the context. */
export interface HookClass<T extends IHookContext = IHookContext> {
  execute(context: Omit<T, 'scope'>): void | Promise<void>;
}

/** Anything `@hook(...)` accepts: a {@link HookFn} or a {@link HookClass} constructor. */
export type HookType<T extends IHookContext = IHookContext> = HookFn<T> | constructor<HookClass<T>>;

/** The hooks of one class under one key, by member name: one hook per member (compose with `sequential` / `parallel`). */
export type HooksOfClass = Map<string, HookType>;

const isHookClassConstructor = <C extends IHookContext>(
  execute: HookFn<C> | constructor<HookClass<C>>,
): execute is constructor<HookClass<C>> => {
  return Is.constructor(execute) && execute.prototype.execute;
};

/** Normalizes a {@link HookType} to a {@link HookFn}; a hook class is resolved from the context's scope. */
export const toHookFn = <C extends IHookContext>(execute: HookFn<C> | constructor<HookClass<C>>): HookFn<C> =>
  isHookClassConstructor(execute) ? (context) => context.scope.resolve(execute).execute(context) : execute;

/**
 * Reads the hooks declared under `key`, merging hooks declared on parent classes.
 * Hooks are collected from base to derived, so a derived class's hook for the
 * same member replaces the parent's.
 *
 * `target` is an instance or its class, a proxy of either included - it is
 * normalized by `resolveConstructor`, so callers never unwrap it themselves.
 *
 * The merge runs on every call and returns a fresh map. Hook metadata is fixed
 * once a class is defined, so a caller which reads it often can wrap this in
 * `memoize` (`HookCollector` already does).
 */
export function getHooks(target: Instance | constructor<unknown>, key: string | symbol): HooksOfClass {
  const merged: HooksOfClass = new Map();
  for (const ctor of getConstructorChain(resolveConstructor(target)).reverse()) {
    const ownHooks: HooksOfClass | undefined = Reflect.getOwnMetadata(key, ctor);
    if (ownHooks) {
      for (const [methodName, fn] of ownHooks) {
        merged.set(methodName, fn);
      }
    }
  }
  return merged;
}

/** Whether `target` (an instance or class, proxies included) declares any hook under `key`. */
export function hasHooks(target: Instance | constructor<unknown>, key: string | symbol): boolean {
  return getConstructorChain(resolveConstructor(target)).some((ctor) => Reflect.hasOwnMetadata(key, ctor));
}

/**
 * Method/property decorator that declares a hook under `key`. The library only
 * stores it: collect with `new HookCollector({ key })` and run the actions
 * yourself. A member carries exactly one hook per key - decorating it twice
 * replaces the earlier hook; compose several with `sequential(...)` / `parallel(...)`.
 *
 * @example
 * const onInit = (fn: HookType) => hook('onInit', fn);
 *
 * class Service {
 *   @onInit((ctx) => {
 *     ctx.invokeMethod({ args: ctx.resolveArgs() });
 *   })
 *   init() {}
 * }
 */
export const hook = (key: string | symbol, fn: HookType) => (target: object, propertyKey: string | symbol) => {
  const hooks: HooksOfClass = Reflect.hasOwnMetadata(key, target.constructor)
    ? Reflect.getOwnMetadata(key, target.constructor)
    : new Map();
  hooks.set(propertyKey as string, fn);
  Reflect.defineMetadata(key, hooks, target.constructor);
};
