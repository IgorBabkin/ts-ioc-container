import type { DependencyHook, IContainer } from '../container/IContainer';
import type { HooksRunner } from './HooksRunner';
import { type HookFn, type HookType, toHookFn } from './hook';
import type { OnExceptionHandler } from './onConstruct';
import { Is } from '../utils/basic';

/**
 * `once` runs the hooks on the first resolve of each instance and stays silent
 * on every later one - the first-resolution rule, opted into per hook.
 */
export type OnResolvedOptions = { once?: boolean };

/**
 * A resolve hook narrowed to the dependencies that can carry hook metadata.
 */
export type ResolvedDependencyHook = (dependency: object, scope: IContainer) => void;

const invokeMethod: HookFn = (context) => {
  context.invokeMethod();
};

/**
 * Wraps a hook so it runs at most once per instance.
 *
 * Instances are remembered in a `WeakSet`, which holds no strong reference, so
 * an instance is collectable once nothing else keeps it alive. The set belongs
 * to the decorated member, so every container and scope handing out the same
 * instance shares one memory of what has already run.
 */
const onceForEachInstance = (execute: HookType): HookFn => {
  const invokedInstances = new WeakSet<object>();

  return (context) => {
    if (invokedInstances.has(context.instance)) {
      return;
    }

    invokedInstances.add(context.instance);
    return toHookFn(execute)(context);
  };
};

/**
 * Reads the optional leading options object of an `@onResolved` decorator, so
 * `@onResolved(hook)` and `@onResolved({ once: true }, hook)` both work.
 */
export const toResolvedHooks = (first: OnResolvedOptions | HookType, rest: HookType[]): HookType[] => {
  const [{ once = false }, fns] =
    typeof first === 'function' ? [{} as OnResolvedOptions, [first, ...rest]] : [first, rest];
  // Decorating a method without naming a hook means "run this method".
  const hooks = fns.length > 0 ? fns : [invokeMethod];

  return once ? hooks.map(onceForEachInstance) : hooks;
};

/**
 * Lifts a hook to `DependencyHook`, skipping dependencies which are not objects:
 * hook metadata lives on classes, and a primitive can carry none.
 */
export const forEachResolvedObject =
  (run: ResolvedDependencyHook): DependencyHook =>
  (dependency, scope) => {
    if (Is.object(dependency)) {
      run(dependency, scope);
    }
  };

/**
 * @throws {unknown} rethrows whatever the hooks threw.
 */
export const executeHooks =
  (runner: HooksRunner): ResolvedDependencyHook =>
  (dependency, scope) =>
    runner.execute(dependency, { scope });

/**
 * Resolution stays synchronous, so async hooks are started on resolve and settle
 * afterwards: `resolve` returns before they finish.
 */
export const executeHooksAsync =
  (runner: HooksRunner, onException?: OnExceptionHandler): ResolvedDependencyHook =>
  (dependency, scope) => {
    if (!runner.hasHooks(dependency)) {
      return;
    }

    /**
     * @throws {unknown} rethrows whatever the hooks rejected with, as an unhandled promise rejection, when no
     * `onException` handler was supplied.
     */
    runner.executeAsync(dependency, { scope }).catch((ex) => {
      if (!onException) {
        throw ex;
      }
      onException(ex, { scope });
    });
  };
