import type { Instance } from '../utils/basic';
import { toHookFn } from './hook';
import { HookExecutionContext, HookExecutionStrategy, HookExecutionStrategyContext } from './HooksExecutionStrategy';
import type { IContainer } from '../container/IContainer';
import { createHookExecutionContext } from './HookContext';

type Props = Partial<HookExecutionStrategyContext> & {
  key: string | symbol;
  methodStrategy?: 'sequential' | 'parallel';
  onError?: (c: IContainer) => (error: unknown) => void;
};

export class ParallelAsync extends HookExecutionStrategy {
  private readonly methodStrategy: 'sequential' | 'parallel';

  constructor(props: Props) {
    super(props);
    this.methodStrategy = props.methodStrategy ?? 'sequential';
  }

  protected async processHooks(
    target: Instance,
    {
      scope,
      createExecutionContext = createHookExecutionContext,
      mapExecutionContext = (ctx) => ctx,
      predicate = () => true,
    }: HookExecutionContext,
  ) {
    const promises: Promise<void>[] = [];

    for (const [methodName, executions] of this.getHooks(target)) {
      if (predicate(methodName)) {
        const hooks = executions.map(toHookFn);
        const context = createExecutionContext(target, scope, methodName);
        promises.push(
          this.methodStrategy === 'sequential'
            ? this.sequentiallyAsync(hooks, mapExecutionContext(context))
            : this.parallelAsync(hooks, mapExecutionContext(context)),
        );
      }
    }

    await Promise.all(promises);
  }
}
