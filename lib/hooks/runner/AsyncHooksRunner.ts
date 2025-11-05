import { createHookContext } from '../HookContext';
import type { IContainer } from '../../container/IContainer';
import { getHooks, HookFn, toHookFn } from '../hook';
import { promisify } from '../../utils';

export class AsyncHooksRunner {
  constructor(private readonly key: string | symbol) {}

  async execute(
    target: object,
    {
      scope,
      createContext = createHookContext,
      predicate = () => true,
    }: {
      scope: IContainer;
      createContext?: typeof createHookContext;
      predicate?: (methodName: string) => boolean;
    },
  ) {
    const hooks = Array.from(getHooks(target, this.key).entries()).filter(([methodName]) => predicate(methodName));

    const runMethodHooks = async (methodName: string, executions: HookFn[]) => {
      const context = createContext(target, scope, methodName);
      for (const execute of executions) {
        await promisify(execute(context));
      }
    };

    return Promise.all(hooks.map(([methodName, executions]) => runMethodHooks(methodName, executions.map(toHookFn))));
  }
}
