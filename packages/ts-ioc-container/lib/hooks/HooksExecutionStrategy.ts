import { type CreateHookExecutionContext, type IHookContext } from './HookContext';
import type { IContainer } from '../container/IContainer';
import { getHooks, hasHooks, HookFn } from './hook';

import { type Instance } from '../utils/basic';
import type { ExecutionContext } from '../ExecutionContext';

export type MapHookExecutionContext = (context: IHookContext) => IHookContext;

export type OnExceptionHandler = (ex: unknown, context: ExecutionContext) => void;

export type HookExecutionContext = {
  scope: IContainer;
  createExecutionContext?: CreateHookExecutionContext;
  mapExecutionContext?: MapHookExecutionContext;
  predicate?: (methodName: string) => boolean;
};

export type HookExecutionStrategyContext = {
  createExecutionContext: CreateHookExecutionContext;
  mapExecutionContext: MapHookExecutionContext;
  predicate: (methodName: string) => boolean;
};

export type HookExecutionStrategyProps = Partial<HookExecutionStrategyContext> & {
  key: string | symbol;
  onError?: (c: IContainer) => (error: unknown) => void;
};

export abstract class HookExecutionStrategy {
  private readonly key: string | symbol;
  private readonly onError: (c: IContainer) => (err: unknown) => void;

  constructor(protected readonly props: HookExecutionStrategyProps) {
    this.key = props.key;
    this.onError = props.onError ?? (() => () => {});
  }

  hasHooks(target: Instance): boolean {
    return hasHooks(target, this.key);
  }

  /**
   * Runs every hook `target` declares under this strategy's key, the way the
   * strategy defines. Returns before async hooks settle — a failure of either
   * kind, what a sync hook threw and what an async hook rejected with, goes to
   * `onError`. Without an `onError` handler failures are dropped.
   */
  execute(
    target: Instance,
    {
      scope,
      createExecutionContext = this.props.createExecutionContext,
      mapExecutionContext = this.props.mapExecutionContext,
      predicate = this.props.predicate,
    }: HookExecutionContext,
  ): void {
    const report = (ex: unknown) => {
      this.onError(scope)(ex);
    };

    try {
      // An async strategy turns a throw into a rejection, so both are routed to `report`.
      this.processHooks(target, { scope, createExecutionContext, mapExecutionContext, predicate })?.catch(report);
    } catch (ex) {
      report(ex);
    }
  }

  protected getHooks(target: Instance) {
    return getHooks(target, this.key).entries();
  }

  protected abstract processHooks(target: Instance, context: HookExecutionContext): void | Promise<void>;

  protected async sequentiallyAsync(executions: HookFn[], context: IHookContext) {
    for (const hook of executions) {
      await hook(context);
    }
  }

  protected sequentiallySync(executions: HookFn[], context: IHookContext) {
    for (const hook of executions) {
      hook(context);
    }
  }

  protected async parallelAsync(executions: HookFn[], context: IHookContext) {
    await Promise.all(executions.map((hook) => hook(context)));
  }
}
