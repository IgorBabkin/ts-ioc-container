import type { DependencyHook, IContainer } from '../container/IContainer';
import type { HooksRunner } from './HooksRunner';
import { hook, type HookFn, type HookType, prependHooks, toHookFn } from './hook';
import type { OnExceptionHandler } from '../ExecutionContext';
import { Is } from '../utils/basic';

/**
 * A resolve hook narrowed to the dependencies that can carry hook metadata.
 */
export type ResolvedDependencyHook = (dependency: object, scope: IContainer) => void;

/**
 * Invokes the decorated method with its resolved arguments - what every resolve
 * decorator falls back to when no hook is named, so `@onResolved()` and
 * `@onResolved(invokeMethod)` are the same declaration.
 */
export const invokeMethod: HookFn = (context) => {
  context.invokeMethod();
};

// Decorating a method without naming a hook means "run this method".
const toHooks = (hooks: HookType[]): HookType[] => (hooks.length > 0 ? hooks : [invokeMethod]);

/**
 * Wraps a hook so it runs at most once per instance.
 *
 * Instances are remembered in a `WeakSet`, which holds no strong reference, so
 * an instance is collectable once nothing else keeps it alive. The set belongs
 * to the decorated member, so every container and scope handing out the same
 * instance shares one memory of what has already run.
 *
 * This is what turns a per-resolve hook into a per-instance one, and so what
 * `@onceResolved()` is made of: `@onResolved(onceForEachInstance(invokeMethod))`.
 * Wrap your own hooks with it to get the same narrowing.
 */
export const onceForEachInstance = (execute: HookType): HookFn => {
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
 * Builds a resolve-hook decorator over `hook(key, ...)` - the same metadata
 * mechanism as `@onContainerDisposed` and friends, with the "no hook means
 * invoke the decorated method" shorthand on top.
 *
 * Decorators are applied bottom-up, so hooks are prepended to keep them in
 * declaration order: `@onX(h1) @onX(h2) method()` runs h1 before h2.
 */
export const resolvedHook =
  (key: string) =>
  (...hooks: HookType[]) =>
    hook(key, prependHooks(...toHooks(hooks)));

/**
 * `resolvedHook(key)` with every hook wrapped so it runs on the first resolve of
 * each instance only - what the `onceResolved` decorators are built from.
 */
export const onceResolvedHook =
  (key: string) =>
  (...hooks: HookType[]) =>
    hook(key, prependHooks(...toHooks(hooks).map(onceForEachInstance)));

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
 * @throws {unknown} rethrows whatever the hooks threw, when no `onException` handler was supplied.
 */
export const executeHooks =
  (runner: HooksRunner, onException?: OnExceptionHandler): ResolvedDependencyHook =>
  (dependency, scope) => {
    try {
      runner.execute(dependency, { scope });
    } catch (ex) {
      if (!onException) {
        throw ex;
      }
      onException(ex, { scope });
    }
  };

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
