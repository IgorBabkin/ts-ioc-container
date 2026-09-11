import type { Instance } from '../utils/basic';
import { createHookExecutionContext } from './HookContext';
import { toHookFn } from './hook';
import { HookExecutionContext, HookExecutionStrategy } from './HooksExecutionStrategy';

export class SequentialSyncHookExecutionStrategy extends HookExecutionStrategy {
  processHooks(
    target: Instance,
    {
      scope,
      createExecutionContext = createHookExecutionContext,
      mapExecutionContext = (context) => context,
      predicate = () => true,
    }: HookExecutionContext,
  ) {
    for (const [methodName, executions] of this.getHooks(target)) {
      if (predicate(methodName)) {
        const hooks = executions.map(toHookFn);
        const context = createExecutionContext(target, scope, methodName);
        this.sequentiallySync(hooks, mapExecutionContext(context));
      }
    }
  }
}
