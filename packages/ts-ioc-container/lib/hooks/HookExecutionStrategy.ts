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

/** One decorated member's hook, resolved to a function, with the context it runs against. */
export type MemberHook = {
  hook: HookFn;
  context: IHookContext;
};

type ClassHooks = { methodName: string; hook: HookFn }[];

/**
 * How the hooks declared under a key run: in what order the *members* run, what
 * is awaited, and where a failure goes (ADR 0015). A member carries a single
 * hook — how several hooks of one member relate is `sequential(...)` /
 * `parallel(...)` at the declaration site, not the strategy's business. The
 * strategy owns that *how* together with the key; the target and scope arrive
 * with each `execute` call.
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
   * Runs the hook every member of `target` declares under this strategy's key,
   * the way the strategy defines. Returns before async hooks settle — a failure
   * of either kind, what a sync hook threw and what an async hook rejected with,
   * goes to `onError`. Without an `onError` handler failures are dropped.
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
   * The strategy proper: runs the members, each with its own hook and context.
   * Failures — thrown or rejected — are handled by `execute`.
   */
  protected abstract processHooks(members: MemberHook[]): void | Promise<void>;

  private collect(
    target: Instance,
    scope: IContainer,
    {
      createExecutionContext = this.options.createExecutionContext,
      mapExecutionContext = this.options.mapExecutionContext,
      predicate = this.options.predicate,
    }: HookExecutionOptions,
  ): MemberHook[] {
    const members: MemberHook[] = [];
    for (const { methodName, hook } of this.hooksOf(target)) {
      if (predicate(methodName)) {
        members.push({ hook, context: mapExecutionContext(createExecutionContext(target, scope, methodName)) });
      }
    }
    return members;
  }

  private hooksOf(target: Instance): ClassHooks {
    const Target = resolveConstructor(target);
    let hooks = this.hooksByClass.get(Target);
    if (!hooks) {
      hooks = Array.from(getHooks(Target, this.key), ([methodName, fn]) => ({ methodName, hook: toHookFn(fn) }));
      this.hooksByClass.set(Target, hooks);
    }
    return hooks;
  }
}
