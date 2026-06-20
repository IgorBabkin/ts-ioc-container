import { createHookContext, type CreateHookContext, type IHookContext } from './HookContext';
import type { IContainer } from '../container/IContainer';
import { getHooks, HookFn, toHookFn } from './hook';
import { UnexpectedHookResultError } from '../errors/UnexpectedHookResultError';

import { promisify } from '../utils/promise';

export type MapHookContext = (context: IHookContext) => IHookContext;

export type HooksRunnerContext = {
  scope: IContainer;
  createContext?: CreateHookContext;
  mapContext?: MapHookContext;
  predicate?: (methodName: string) => boolean;
};

export class HooksRunner {
  constructor(private readonly key: string | symbol) {}

  execute(
    target: object,
    {
      scope,
      createContext = createHookContext,
      mapContext = (context) => context,
      predicate = () => true,
    }: HooksRunnerContext,
  ) {
    const hooks = Array.from(getHooks(target, this.key).entries()).filter(([methodName]) => predicate(methodName));

    const runMethodHooks = (methodName: string, executions: HookFn[]) => {
      const context = mapContext(createContext(target, scope, methodName));
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
    target: object,
    {
      scope,
      createContext = createHookContext,
      mapContext = (context) => context,
      predicate = () => true,
    }: HooksRunnerContext,
  ) {
    const hooks = Array.from(getHooks(target, this.key).entries()).filter(([methodName]) => predicate(methodName));

    const runMethodHooks = async (methodName: string, executions: HookFn[]) => {
      const context = mapContext(createContext(target, scope, methodName));
      for (const execute of executions) {
        await promisify(execute(context));
      }
    };

    return Promise.all(hooks.map(([methodName, executions]) => runMethodHooks(methodName, executions.map(toHookFn))));
  }
}
