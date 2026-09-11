import type { Instance } from '../utils/basic';
import { createHookExecutionContext } from './HookContext';
import { toHookFn } from './hook';
import { HookExecutionContext, HookExecutionStrategy, HookExecutionStrategyContext } from './HooksExecutionStrategy';
import type { IContainer } from '../container/IContainer';

type Props = Partial<HookExecutionStrategyContext> & {
  key: string | symbol;
  methodStrategy?: 'sequential' | 'parallel';
  onError?: (c: IContainer) => (error: unknown) => void;
};

export class SequentialAsync extends HookExecutionStrategy {
  private readonly methodStrategy: 'sequential' | 'parallel';

  constructor(props: Props) {
    super(props);
    this.methodStrategy = props.methodStrategy ?? 'sequential';
  }

  async processHooks(
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
        if (this.methodStrategy === 'sequential') {
          await this.sequentiallyAsync(hooks, mapExecutionContext(context));
        } else {
          await this.parallelAsync(hooks, mapExecutionContext(context));
        }
      }
    }
  }
}
