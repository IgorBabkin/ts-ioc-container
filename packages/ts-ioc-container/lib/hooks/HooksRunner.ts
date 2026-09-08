import { createHookContext, type CreateHookContext, type IHookContext } from './HookContext';
import type { IContainer } from '../container/IContainer';
import { getHooks, HookFn, hasHooks, toHookFn } from './hook';

import { type Instance } from '../utils/basic';
import type { ExecutionContext } from '../ExecutionContext';

export type MapHookContext = (context: IHookContext) => IHookContext;

export type OnExceptionHandler = (ex: unknown, context: ExecutionContext) => void;

export type HooksRunnerContext = {
  scope: IContainer;
  createContext?: CreateHookContext;
  mapContext?: MapHookContext;
  predicate?: (methodName: string) => boolean;
};

/**
 * Runs `fns` from `index` on, staying synchronous until a hook returns a promise
 * and awaiting the rest of the chain from that point.
 */
const runFrom = (fns: HookFn[], index: number, context: IHookContext): void | Promise<void> => {
  for (let i = index; i < fns.length; i++) {
    const result = fns[i](context);
    if (result instanceof Promise) {
      return result.then(() => runFrom(fns, i + 1, context));
    }
  }
};

export class HooksRunner {
  constructor(private readonly key: string | symbol) {}

  hasHooks(target: Instance): boolean {
    return hasHooks(target, this.key);
  }

  /**
   * Runs every hook registered under this runner's key.
   *
   * Hooks may be sync or async, and one runner takes both: a hook chain runs
   * eagerly and stays synchronous until a hook returns a promise, then awaits
   * the remaining hooks of that member. So `execute` returns `undefined` when
   * nothing went async — every hook has already finished by the time it returns
   * — and a promise settling after the async hooks otherwise.
   *
   * Each decorated member gets its own chain and they are started in order; the
   * returned promise settles once all of them have.
   *
   * @throws {unknown} rethrows, synchronously, whatever a sync hook threw.
   */
  execute(
    target: Instance,
    {
      scope,
      createContext = createHookContext,
      mapContext = (context) => context,
      predicate = () => true,
    }: HooksRunnerContext,
  ): void | Promise<void> {
    const hooks = Array.from(getHooks(target, this.key).entries()).filter(([methodName]) => predicate(methodName));

    const pending: Promise<void>[] = [];
    for (const [methodName, executions] of hooks) {
      const context = mapContext(createContext(target, scope, methodName));
      const result = runFrom(executions.map(toHookFn), 0, context);
      if (result) {
        pending.push(result);
      }
    }

    return pending.length > 0 ? Promise.all(pending).then(() => undefined) : undefined;
  }
}

/**
 * Runs `runner`'s hooks on `target` and reports a failure of either kind to
 * `onException`: what a sync hook threw, and what an async hook rejected with.
 *
 * @throws {unknown} rethrows, synchronously, what a sync hook threw when no `onException` handler was supplied.
 * @throws {unknown} rethrows what an async hook rejected with, as an unhandled promise rejection, when no
 * `onException` handler was supplied.
 */
export const runHooks = (
  runner: HooksRunner,
  target: Instance,
  scope: IContainer,
  onException?: OnExceptionHandler,
): void => {
  const report = (ex: unknown) => {
    if (!onException) {
      throw ex;
    }
    onException(ex, { scope });
  };

  try {
    runner.execute(target, { scope })?.catch(report);
  } catch (ex) {
    report(ex);
  }
};
