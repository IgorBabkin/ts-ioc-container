import type { IContainer } from '../container/IContainer';
import { getHooks, HookFn, toHookFn } from './hook';
import { UnexpectedHookResultError } from '../errors/UnexpectedHookResultError';

import { promisify } from '../utils/promise';
import { DefaultHookContextBuilder, IHookContextBuilder } from './HookContextBuilder';

export type HooksRunnerContext = {
  scope: IContainer;
  contextBuilder?: IHookContextBuilder;
  predicate?: (methodName: string) => boolean;
};

export class HooksRunner {
  constructor(private readonly key: string | symbol) {}

  execute(
    target: object,
    { scope, contextBuilder = new DefaultHookContextBuilder(), predicate = () => true }: HooksRunnerContext,
  ) {
    const hooks = Array.from(getHooks(target, this.key).entries()).filter(([methodName]) => predicate(methodName));
    contextBuilder.mergeOptions({ target, scope });

    const runMethodHooks = (methodName: string, executions: HookFn[]) => {
      const context = contextBuilder.build({ methodName });
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
    { scope, contextBuilder = new DefaultHookContextBuilder(), predicate = () => true }: HooksRunnerContext,
  ) {
    const hooks = Array.from(getHooks(target, this.key).entries()).filter(([methodName]) => predicate(methodName));
    contextBuilder.mergeOptions({ target, scope });

    const runMethodHooks = async (methodName: string, executions: HookFn[]) => {
      const context = contextBuilder.build({ methodName });
      for (const execute of executions) {
        await promisify(execute(context));
      }
    };

    return Promise.all(hooks.map(([methodName, executions]) => runMethodHooks(methodName, executions.map(toHookFn))));
  }
}
