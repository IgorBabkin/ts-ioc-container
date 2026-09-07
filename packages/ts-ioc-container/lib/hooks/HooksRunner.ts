import { createHookContext, type CreateHookContext, type IHookContext } from './HookContext';
import type { IContainer } from '../container/IContainer';
import { getHooks, hasHooks, HookFn, toHookFn } from './hook';
import { UnexpectedHookResultError } from '../errors/UnexpectedHookResultError';

import { promisify } from '../utils/promise';
import { type Instance } from '../utils/basic';
import { ProxyRegistry } from '../utils/ProxyRegistry';

export type MapHookContext = (context: IHookContext) => IHookContext;

export type HooksRunnerContext = {
  scope: IContainer;
  createContext?: CreateHookContext;
  mapContext?: MapHookContext;
  predicate?: (methodName: string) => boolean;
};

/**
 * Runs the hooks a class declares under one metadata key.
 *
 * Every method takes the instance the container produced, which may be a proxy
 * (a `lazy()` provider hands one out). Hook metadata lives on the real class and
 * hooks act on the real instance, so the target is unwrapped here - callers pass
 * whatever they hold and never unwrap it themselves.
 */
export class HooksRunner {
  constructor(private readonly key: string | symbol) {}

  hasHooks(target: Instance): boolean {
    return hasHooks(target, this.key);
  }

  /**
   * @throws {UnexpectedHookResultError} when a hook returns a `Promise` — use {@link executeAsync} for async hooks.
   */
  execute(
    target: Instance,
    {
      scope,
      createContext = createHookContext,
      mapContext = (context) => context,
      predicate = () => true,
    }: HooksRunnerContext,
  ) {
    const instance = ProxyRegistry.getInstance().unwrap(target);
    const hooks = Array.from(getHooks(instance, this.key).entries()).filter(([methodName]) => predicate(methodName));

    const runMethodHooks = (methodName: string, executions: HookFn[]) => {
      const context = mapContext(createContext(instance, scope, methodName));
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
  }

  async executeAsync(
    target: Instance,
    {
      scope,
      createContext = createHookContext,
      mapContext = (context) => context,
      predicate = () => true,
    }: HooksRunnerContext,
  ) {
    const instance = ProxyRegistry.getInstance().unwrap(target);
    const hooks = Array.from(getHooks(instance, this.key).entries()).filter(([methodName]) => predicate(methodName));

    const runMethodHooks = async (methodName: string, executions: HookFn[]) => {
      const context = mapContext(createContext(instance, scope, methodName));
      for (const execute of executions) {
        await promisify(execute(context));
      }
    };

    return Promise.all(hooks.map(([methodName, executions]) => runMethodHooks(methodName, executions.map(toHookFn))));
  }
}
