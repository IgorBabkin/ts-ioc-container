import { createHookContext } from '../HookContext';
import { getHooks, HookFn, toHookFn } from '../hook';
import { UnexpectedHookResultError } from '../../errors/UnexpectedHookResultError';
import { HooksRunnerContext } from './HooksRunner';

export class SyncHooksRunner {
  constructor(private readonly key: string | symbol) {}

  execute(target: object, { scope, createContext = createHookContext, predicate = () => true }: HooksRunnerContext) {
    const hooks = Array.from(getHooks(target, this.key).entries()).filter(([methodName]) => predicate(methodName));

    const runMethodHooks = (methodName: string, executions: HookFn[]) => {
      const context = createContext(target, scope, methodName);
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
}
