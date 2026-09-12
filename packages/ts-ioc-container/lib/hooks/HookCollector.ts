import type { ExecutionContext } from '../ExecutionContext';
import { resolveConstructor } from '../metadata/target';
import { type Task } from '../utils/task';
import { type Instance } from '../utils/basic';
import { memoize } from '../utils/memoize';
import { getHooks, hasHooks, type HookFn, toHookFn } from './hook';
import { createHookExecutionContext, type CreateHookExecutionContext, type IHookContext } from './HookContext';

export type MapHookExecutionContext = (context: IHookContext) => IHookContext;

/**
 * One decorated member's hook, resolved to a function and bound to the context
 * it runs against — the model the library hands back, and the whole of what it
 * says about a hook. The member it came from is `context.methodName`.
 * Performing it is the caller's business (ADR 0016).
 */
export type HookAction = {
  hook: HookFn;
  context: IHookContext;
};

/**
 * Shapes what is collected: how each action's hook context is built, and which
 * members take part. A collector carries defaults for all three, so a call
 * names only what it overrides.
 */
export type HookCollectorOptions = {
  createExecutionContext?: CreateHookExecutionContext;
  mapExecutionContext?: MapHookExecutionContext;
  predicate?: (methodName: string) => boolean;
};

/** What one collection runs in: the scope, plus any per-call overrides of the collector's options. */
export type HookCollectionContext = ExecutionContext & HookCollectorOptions;

export type HookCollectorProps = HookCollectorOptions & {
  /** The hook key this collector reads: `onConstruct`, `onScopeDisposed`, `onResolved`, or a custom one. */
  key: string | symbol;
};

/**
 * Reads the hooks declared under one key off a target and hands them back as
 * {@link HookAction}s, in declaration order. It runs nothing: what order the
 * actions are performed in, what is awaited and where a failure goes are
 * answered by the caller (ADR 0016).
 *
 * Wire it to whichever event should collect — the injector's `onConstructed`,
 * the scope's `scopeDisposed`, a provider's `onResolved` — the library ships no
 * module which does that for you (ADR 0018).
 *
 * ```typescript
 * const collector = new HookCollector({ key: 'onStart' });
 *
 * container.getInjector().onConstructed((instance, scope) => {
 *   runInOrder(collector.getActions(instance, { scope }).map(toTask))?.catch(report);
 * });
 * ```
 */
export class HookCollector {
  private readonly key: string | symbol;
  private readonly options: Required<HookCollectorOptions>;
  // Hook metadata is fixed once a class is defined - decorators have all run by the time
  // there is an instance to read them off - so the merge runs once per class and key.
  private readonly hooksOf = memoize(getHooks);

  constructor({
    key,
    createExecutionContext = createHookExecutionContext,
    mapExecutionContext = (context) => context,
    predicate = () => true,
  }: HookCollectorProps) {
    this.key = key;
    this.options = { createExecutionContext, mapExecutionContext, predicate };
  }

  hasHooks(target: Instance): boolean {
    return hasHooks(target, this.key);
  }

  /** The actions `target` declares under this collector's key — empty when it declares none. */
  getActions(
    target: Instance,
    {
      scope,
      createExecutionContext = this.options.createExecutionContext,
      mapExecutionContext = this.options.mapExecutionContext,
      predicate = this.options.predicate,
    }: HookCollectionContext,
  ): HookAction[] {
    const actions: HookAction[] = [];
    for (const [methodName, fn] of this.hooksOf(resolveConstructor(target), this.key)) {
      if (predicate(methodName)) {
        actions.push({
          hook: toHookFn(fn),
          context: mapExecutionContext(createExecutionContext(target, scope, methodName)),
        });
      }
    }
    return actions;
  }
}

/** The {@link Task} an action runs as: `runInOrder(actions.map(toTask))`, `runAtOnce(actions.map(toTask))`. */
export const toTask =
  ({ hook, context }: HookAction): Task =>
  () =>
    hook(context);
