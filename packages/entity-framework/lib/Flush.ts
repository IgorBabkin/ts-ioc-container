import { EntityReferenceError } from './errors';

/**
 * One commit, in two phases: writes go to the repositories as they are made,
 * while what they change in memory — snapshots, the identity map, created lazy
 * records — waits in `onCommit` until every write succeeded. A flush that
 * throws is never committed, so the unit of work stays as it was and can be
 * flushed again. Internal: not exported from the package.
 */
export class Flush {
  private readonly written = new Map<object, Promise<unknown>>();
  private readonly writing = new Set<object>();
  private readonly commits: (() => void)[] = [];

  /**
   * Runs `write` for `target` once in this flush; a later call answers what the
   * first did.
   *
   * @throws {EntityReferenceError} when `target` is reached again while it is being written: a cycle.
   */
  once<T>(target: object, write: () => Promise<T>): Promise<T> {
    if (this.writing.has(target)) {
      return Promise.reject(
        new EntityReferenceError(
          'Lazy records are linked into each other in a cycle, so none can be created first. ' +
            'Break the cycle: link one side, flush, then set the other field to the id it got.',
        ),
      );
    }
    let result = this.written.get(target) as Promise<T> | undefined;
    if (result === undefined) {
      this.writing.add(target);
      result = write().finally(() => this.writing.delete(target));
      this.written.set(target, result);
    }
    return result;
  }

  /** Runs `change` when the flush commits — only once every write succeeded. */
  onCommit(change: () => void): void {
    this.commits.push(change);
  }

  commit(): void {
    for (const change of this.commits) change();
  }
}
