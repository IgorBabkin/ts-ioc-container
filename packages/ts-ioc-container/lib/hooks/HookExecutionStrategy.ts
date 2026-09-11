import type { IContainer } from '../container/IContainer';
import type { ExecutionContext } from '../ExecutionContext';
import { resolveConstructor } from '../metadata/target';
import { type constructor, type Instance } from '../utils/basic';
import { getHooks, hasHooks, type HookFn, toHookFn } from './hook';
import { createHookExecutionContext, type CreateHookExecutionContext, type IHookContext } from './HookContext';

export type MapHookExecutionContext = (context: IHookContext) => IHookContext;

/** Receives a hook failure — what a sync hook threw, or what an async hook rejected with — in the scope it ran in. */
export type OnErrorHandler = (scope: IContainer) => (error: unknown) => void;

/**
 * Shapes one run: how each member's hook context is built, and which members
 * take part. A strategy carries defaults for all three, so a call names only
 * what it overrides.
 */
export type HookExecutionOptions = {
  createExecutionContext?: CreateHookExecutionContext;
  mapExecutionContext?: MapHookExecutionContext;
  predicate?: (methodName: string) => boolean;
};

/** What one `execute` call runs in: the scope, plus any per-call overrides of the strategy's options. */
export type HookExecutionContext = ExecutionContext & HookExecutionOptions;

export type HookExecutionStrategyProps = HookExecutionOptions & {
  /** The hook key this strategy reads: `onConstruct`, `onScopeDisposed`, `onResolved`, or a custom one. */
  key: string | symbol;
  /** Without it, failures are dropped. */
  onError?: OnErrorHandler;
};

/** The hooks of one decorated member, resolved to functions, with the context they run against. */
export type MemberHooks = {
  hooks: HookFn[];
  context: IHookContext;
};

type ClassHooks = { methodName: string; hooks: HookFn[] }[];

/**
 * Runs `hooks` in declaration order, staying synchronous until one returns a
 * promise and awaiting the rest from that point (ADR 0013).
 */
export const runInOrder = (hooks: HookFn[], context: IHookContext, from = 0): void | Promise<void> => {
  for (let i = from; i < hooks.length; i++) {
    const result = hooks[i](context);
    if (result instanceof Promise) {
      return result.then(() => runInOrder(hooks, context, i + 1));
    }
  }
};

/**
 * Starts every hook at once. Settles once all have; `undefined` when none went
 * async, so a fully synchronous run hands back no promise.
 */
export const runAtOnce = (hooks: HookFn[], context: IHookContext): void | Promise<void> => {
  const pending: Promise<void>[] = [];
  for (const hook of hooks) {
    const result = hook(context);
    if (result instanceof Promise) {
      pending.push(result);
    }
  }
  return pending.length > 0 ? Promise.all(pending).then(() => undefined) : undefined;
};

/**
 * How the hooks declared under a key run: in what order, what is awaited, and
 * where a failure goes (ADR 0014). The strategy owns that *how* together with
 * the key; the target and scope arrive with each `execute` call.
 */
export abstract class HookExecutionStrategy {
  private readonly key: string | symbol;
  private readonly onError?: OnErrorHandler;
  private readonly options: Required<HookExecutionOptions>;
  // Hook metadata is fixed once a class is defined, so it is read and resolved to functions once per class.
  private readonly hooksByClass = new WeakMap<constructor<unknown>, ClassHooks>();

  constructor({
    key,
    onError,
    createExecutionContext = createHookExecutionContext,
    mapExecutionContext = (context) => context,
    predicate = () => true,
  }: HookExecutionStrategyProps) {
    this.key = key;
    this.onError = onError;
    this.options = { createExecutionContext, mapExecutionContext, predicate };
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
  execute(target: Instance, { scope, ...overrides }: HookExecutionContext): void {
    const report = (ex: unknown) => this.onError?.(scope)(ex);

    try {
      // An async strategy turns a throw into a rejection, so both are routed to `report`.
      this.processHooks(this.collect(target, scope, overrides))?.catch(report);
    } catch (ex) {
      report(ex);
    }
  }

  /**
   * The strategy proper: runs the members, each with its own hooks and context.
   * Failures — thrown or rejected — are handled by `execute`.
   */
  protected abstract processHooks(members: MemberHooks[]): void | Promise<void>;

  private collect(
    target: Instance,
    scope: IContainer,
    {
      createExecutionContext = this.options.createExecutionContext,
      mapExecutionContext = this.options.mapExecutionContext,
      predicate = this.options.predicate,
    }: HookExecutionOptions,
  ): MemberHooks[] {
    const members: MemberHooks[] = [];
    for (const { methodName, hooks } of this.hooksOf(target)) {
      if (predicate(methodName)) {
        members.push({ hooks, context: mapExecutionContext(createExecutionContext(target, scope, methodName)) });
      }
    }
    return members;
  }

  private hooksOf(target: Instance): ClassHooks {
    const Target = resolveConstructor(target);
    let hooks = this.hooksByClass.get(Target);
    if (!hooks) {
      hooks = Array.from(getHooks(Target, this.key), ([methodName, fns]) => ({ methodName, hooks: fns.map(toHookFn) }));
      this.hooksByClass.set(Target, hooks);
    }
    return hooks;
  }
}
