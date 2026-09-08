import type { IContainer } from '../container/IContainer';
import type { ProviderHook } from '../provider/IProvider';
import { type HooksRunner, type OnExceptionHandler, runHooks } from './HooksRunner';
import { hook, type HookFn, type HookType, prependHooks, toHookFn } from './hook';
import { Is } from '../utils/basic';

/**
 * A {@link ProviderHook} narrowed to the dependencies that can carry hook metadata.
 */
export type ResolvedObjectHook = (dependency: object, scope: IContainer) => void;

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
 * Wraps a hook so it runs at most once per instance - compose it with
 * `@onResolved`/`@onResolvedAsync` (e.g. `@onResolved(onceForEachInstance(invokeMethod))`)
 * to run on the first resolve of each instance only.
 *
 * Instances are remembered in a `WeakSet`, which holds no strong reference, so
 * an instance is collectable once nothing else keeps it alive. The set belongs
 * to the wrapped hook, so every container and scope handing out the same
 * instance shares one memory of what has already run.
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
 * mechanism as `@onConstruct` and friends, with the "no hook means invoke the
 * decorated method" shorthand on top.
 *
 * Decorators are applied bottom-up, so hooks are prepended to keep them in
 * declaration order: `@onX(h1) @onX(h2) method()` runs h1 before h2.
 */
export const resolvedHook =
  (key: string) =>
  (...hooks: HookType[]) =>
    hook(key, prependHooks(...toHooks(hooks)));

/**
 * Lifts a hook to `ProviderHook`, skipping dependencies which are not objects:
 * hook metadata lives on classes, and a primitive can carry none.
 */
export const forEachResolvedObject =
  (run: ResolvedObjectHook): ProviderHook =>
  (dependency, scope) => {
    if (Is.object(dependency)) {
      run(dependency, scope);
    }
  };

/**
 * Runs the resolved dependency's hooks, reporting a sync throw and a rejected
 * async hook alike to `onException` when one is supplied.
 *
 * Resolution stays synchronous: sync hooks finish before `resolve` returns,
 * async ones are started there and settle afterwards.
 *
 * @throws {unknown} rethrows whatever the hooks threw or rejected with, when no `onException` handler was
 * supplied — synchronously for a sync hook, as an unhandled promise rejection for an async one.
 */
export const executeHooks =
  (runner: HooksRunner, onException?: OnExceptionHandler): ResolvedObjectHook =>
  (dependency, scope) =>
    runHooks(runner, dependency, scope, onException);
