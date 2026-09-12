import type { IContainer } from '../container/IContainer';
import { runAtOnce, runInOrder } from '../utils/task';
import { type HookFn, type HookType, toHookFn } from './hook';

/**
 * A provider hook narrowed to the dependencies that can carry hook metadata.
 */
export type ResolvedObjectHook = (dependency: object, scope: IContainer) => void;

/**
 * Combines hooks into one which runs them in declaration order, staying
 * synchronous until one returns a promise and awaiting the rest from that point.
 *
 * A member carries a single hook, so this is how several are declared together:
 * `@hook('onConstruct', sequential(validate, persist))`.
 */
export const sequential = (...hooks: HookType[]): HookFn => {
  const fns = hooks.map(toHookFn);
  return (context) => runInOrder(fns.map((fn) => () => fn(context)));
};

/**
 * Combines hooks into one which starts them all at once. Settles when every
 * hook has; a fully synchronous run returns nothing, like {@link sequential}.
 *
 * Use it for hooks of one member which do not depend on each other:
 * `@hook('onScopeDisposed', parallel(flush, closeSocket))`.
 */
export const parallel = (...hooks: HookType[]): HookFn => {
  const fns = hooks.map(toHookFn);
  return (context) => runAtOnce(fns.map((fn) => () => fn(context)));
};

/**
 * Wraps a hook so it runs a single time per instance, however often the event
 * it is declared under fires. Composes with the combinators above —
 * `oncePerInstance(sequential(connect, warmUp))` runs the whole sequence once.
 */
export const oncePerInstance = (execute: HookType): HookFn => {
  const invokedInstances = new WeakSet<object>();
  const fn = toHookFn(execute);

  return (context) => {
    if (invokedInstances.has(context.instance)) {
      return;
    }

    invokedInstances.add(context.instance);
    return fn(context);
  };
};
