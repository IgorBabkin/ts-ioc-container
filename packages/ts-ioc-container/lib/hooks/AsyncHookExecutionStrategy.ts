import {
  HookExecutionStrategy,
  type HookExecutionStrategyProps,
  type MemberHooks,
  runAtOnce,
  runInOrder,
} from './HookExecutionStrategy';

/**
 * How the hooks of one member relate: `sequential` runs them in declaration
 * order, each awaited before the next; `parallel` starts them all at once.
 */
export type MethodStrategy = 'sequential' | 'parallel';

export type AsyncHookExecutionStrategyProps = HookExecutionStrategyProps & {
  /** Always named explicitly: whether the hooks of one member run in declaration order or all at once. */
  methodStrategy: MethodStrategy;
};

/**
 * Common ground of the strategies which await async hooks: the concrete class
 * decides how *members* relate to each other, `methodStrategy` decides how the
 * hooks *within* one member do. Either way a run stays synchronous until a hook
 * returns a promise, so sync hooks finish before `execute` returns.
 */
export abstract class AsyncHookExecutionStrategy extends HookExecutionStrategy {
  private readonly methodStrategy: MethodStrategy;

  constructor({ methodStrategy, ...props }: AsyncHookExecutionStrategyProps) {
    super(props);
    this.methodStrategy = methodStrategy;
  }

  /** Runs one member's hooks per `methodStrategy`; `undefined` unless a hook went async. */
  protected runMember({ hooks, context }: MemberHooks): void | Promise<void> {
    return this.methodStrategy === 'parallel' ? runAtOnce(hooks, context) : runInOrder(hooks, context);
  }
}
