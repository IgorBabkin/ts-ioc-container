/**
 * A unit of work which may or may not go async: the sync-until-async shape the
 * hook machinery is built on (ADR 0013).
 */
export type Task = () => void | Promise<void>;

/**
 * Runs `tasks` in order, staying synchronous until one returns a promise and
 * awaiting the rest from that point. `undefined` when none went async.
 */
export const runInOrder = (tasks: Task[], from = 0): void | Promise<void> => {
  for (let i = from; i < tasks.length; i++) {
    const result = tasks[i]();
    if (result instanceof Promise) {
      return result.then(() => runInOrder(tasks, i + 1));
    }
  }
};

/**
 * Starts every task at once. Settles once all have; `undefined` when none went
 * async, so a fully synchronous run hands back no promise.
 */
export const runAtOnce = (tasks: Task[]): void | Promise<void> => {
  const pending: Promise<void>[] = [];
  for (const task of tasks) {
    const result = task();
    if (result instanceof Promise) {
      pending.push(result);
    }
  }
  return pending.length > 0 ? Promise.all(pending).then(() => undefined) : undefined;
};
