/**
 * One commit, in two phases: writes go to the repositories as they are made,
 * while what they change in memory — snapshots, the identity map — waits in
 * `onCommit` until every write succeeded. A flush that throws is never
 * committed, so the unit of work stays as it was and can be flushed again.
 * Internal: not exported from the package.
 */
export class Flush {
  private readonly commits: (() => void)[] = [];

  /** Runs `change` when the flush commits — only once every write succeeded. */
  onCommit(change: () => void): void {
    this.commits.push(change);
  }

  commit(): void {
    for (const change of this.commits) change();
  }
}
