import type { Entity } from './Entity';
import { EntityReferenceError } from './errors';
import type { AnyRepository, IEntity } from './IRepository';

/**
 * One write a commit makes: a record created, a record updated with only the
 * fields that changed, or a record deleted — with the entity it comes from and
 * the repository it goes through. What `getChanges` answers, what `commit`
 * answers, and what `committed` listeners receive.
 */
export type Change<State extends IEntity = IEntity, E extends Entity<State> = Entity<State>> =
  | { readonly type: 'create'; readonly entity: E; readonly repository: AnyRepository; readonly record: State }
  | {
      readonly type: 'update';
      readonly entity: E;
      readonly repository: AnyRepository;
      readonly stored: State;
      readonly diff: Partial<State>;
    }
  | { readonly type: 'delete'; readonly entity: E; readonly repository: AnyRepository; readonly stored: State };

/** A field of a repository's records that holds ids of another repository's records. */
export interface Reference {
  readonly field: string;
  readonly target: AnyRepository;
}

/**
 * `changes` in the order a commit writes them: creates and updates first, then
 * deletes. A create or update goes after the creates of the records it
 * references; a delete goes before the deletes of the records it references.
 * Otherwise changes keep the order they were given in.
 *
 * @throws {EntityReferenceError} when new records, or deleted ones, reference each other in a cycle.
 */
export function orderChanges(
  changes: readonly Change[],
  referencesOf: (repository: AnyRepository) => readonly Reference[],
): Change[] {
  const writes = changes.filter((change) => change.type !== 'delete');
  const deletes = changes.filter((change) => change.type === 'delete');
  const creates = indexById(writes.filter((change) => change.type === 'create'));
  const deleted = indexById(deletes);

  // A write waits for the creates of the records its written fields reference.
  const orderedWrites = topologicalOrder(writes, (write) =>
    referenced(write, write.type === 'create' ? write.record : (write as { diff: object }).diff, referencesOf, creates),
  );
  // A deleted record goes before the deleted records it references: so those are deleted after it.
  const orderedDeletes = topologicalOrder(deletes, (removal) =>
    deletes.filter((other) => referenced(other, other.stored, referencesOf, deleted).includes(removal)),
  );
  return [...orderedWrites, ...orderedDeletes];
}

/** The changes in `index` that `values` references through `change`'s repository's references. */
function referenced(
  change: Change,
  values: object,
  referencesOf: (repository: AnyRepository) => readonly Reference[],
  index: Map<AnyRepository, Map<unknown, Change>>,
): Change[] {
  const found: Change[] = [];
  for (const { field, target } of referencesOf(change.repository)) {
    if (!Object.hasOwn(values, field)) continue;
    const value = (values as Record<string, unknown>)[field];
    for (const id of Array.isArray(value) ? value : [value]) {
      const other = index.get(target)?.get(id);
      if (other !== undefined && other !== change) found.push(other);
    }
  }
  return found;
}

function indexById(changes: readonly Change[]): Map<AnyRepository, Map<unknown, Change>> {
  const index = new Map<AnyRepository, Map<unknown, Change>>();
  for (const change of changes) {
    let byId = index.get(change.repository);
    if (byId === undefined) index.set(change.repository, (byId = new Map()));
    byId.set(change.entity.id, change);
  }
  return index;
}

/**
 * `items` with each one after those `dependsOn` answers for it; among the ones
 * free to go, the earliest given goes first.
 *
 * @throws {EntityReferenceError} when the dependencies form a cycle.
 */
function topologicalOrder(items: readonly Change[], dependsOn: (item: Change) => Change[]): Change[] {
  const waitingFor = new Map(items.map((item) => [item, new Set(dependsOn(item))]));
  const ordered: Change[] = [];
  while (ordered.length < items.length) {
    const next = items.find((item) => waitingFor.has(item) && waitingFor.get(item)!.size === 0);
    if (next === undefined) {
      const stuck = items.filter((item) => waitingFor.has(item)).map(describe);
      throw new EntityReferenceError(
        `${stuck.join(', ')} reference each other in a cycle, so no order of writes satisfies their foreign keys. ` +
          'Make one of the foreign keys deferrable, or set one side after the commit.',
      );
    }
    waitingFor.delete(next);
    for (const waiting of waitingFor.values()) waiting.delete(next);
    ordered.push(next);
  }
  return ordered;
}

const describe = (change: Change): string => `${change.repository.entityName} ${String(change.entity.id)}`;
