import {
  type ExecutionContext,
  type HookAction,
  type HookCollectionContext,
  HookCollector,
  type IContainer,
  type Instance,
  runAtOnce,
  runInOrder,
  toTask,
} from '../../lib';

/**
 * What performs collected actions. The library names no such type — it neither
 * calls a runner nor is handed one — so this is ours, as it is every
 * consumer's.
 */
export type HookRunner = (actions: HookAction[], context: ExecutionContext) => void;

/** Receives a hook failure — what a sync hook threw, or what an async one rejected with — in the scope it ran in. */
export type OnError = (scope: IContainer) => (error: unknown) => void;

// Routes a sync throw and an async rejection alike to `onError`; without one, failures are dropped.
const guard =
  (run: (actions: HookAction[]) => void | Promise<void>, onError?: OnError): HookRunner =>
  (actions, { scope }) => {
    const report = (ex: unknown) => onError?.(scope)(ex);

    try {
      run(actions)?.catch(report);
    } catch (ex) {
      report(ex);
    }
  };

/** Performs every action one after another and never awaits. */
export const runSync = (onError?: OnError): HookRunner =>
  guard((actions) => {
    for (const { hook, context } of actions) {
      hook(context);
    }
  }, onError);

/** Awaits an action which goes async before starting the next one. */
export const runSequential = (onError?: OnError): HookRunner =>
  guard((actions) => runInOrder(actions.map(toTask)), onError);

/** Starts every action without waiting for the previous one. */
export const runParallel = (onError?: OnError): HookRunner =>
  guard((actions) => runAtOnce(actions.map(toTask)), onError);

/** Collect, then run — what a module does with each event, for tests which drive a hook key directly. */
export const perform =
  (run: HookRunner, collector: HookCollector) =>
  (target: Instance, context: HookCollectionContext): void =>
    run(collector.getActions(target, context), context);
