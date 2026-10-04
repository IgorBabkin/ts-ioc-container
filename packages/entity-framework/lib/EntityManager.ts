import { type Change, orderChanges } from './changes';
import { Entity, type EntityClass, type EntityOptions, markStored } from './Entity';
import { EntityIdentityError, EntityNotFoundError } from './errors';
import { Flush } from './Flush';
import {
  type AnyRepository,
  type EntityOf,
  type IRepository,
  type KeyOf,
  type NewOf,
  type RequireKeyOf,
  type StateOf,
} from './IRepository';
import { isPlainObject } from './snapshot';

/** How a `UnitOfWork` checks and writes a manager's changes in its own order; not exported from the package. */
export const checkIdentities = Symbol('checkIdentities');
export const writeChange = Symbol('writeChange');
export const trackedAt = Symbol('trackedAt');

/** When an entity was first tracked, across every manager — so a unit of work keeps one tracking order. */
let tracking = 0;

/**
 * The unit of work over one repository: an identity map, so each record is read
 * once and every read of its key answers the same entity, and the changes made
 * to those entities — written by `flush`, or by the `UnitOfWork` it belongs to.
 * Entities are built with the repository's `entityClass`, so a subclass's own
 * methods are there on everything this answers.
 *
 * Usually answered by a `UnitOfWork` — `uow.of(IOrderRepositoryToken)`, or
 * injected with `managerOf(IOrderRepositoryToken)` — which commits every
 * repository's changes together. Built on its own, `new EntityManager(repository)`,
 * it is a unit of work over that one repository.
 *
 * @example
 * const orders = uow.of(IOrderRepositoryToken);
 * const order = await orders.findByIdOrFail('o-1');
 * order.state.status = 'cancelled';
 * await db.transaction(() => uow.commit());
 */
export class EntityManager<TRepository extends AnyRepository = AnyRepository> {
  /** Tracked entities by the identity of their key, in the order they were first tracked. */
  private readonly entities = new Map<string, Entity<StateOf<TRepository>>>();
  private readonly keys = new WeakMap<Entity<StateOf<TRepository>>, string>();
  private readonly sequence = new WeakMap<Entity<StateOf<TRepository>>, number>();
  /** Reads still waiting on the repository, by identity, so a concurrent read of the same key shares them. */
  private readonly reading = new Map<string, Promise<EntityOf<TRepository> | undefined>>();

  constructor(readonly repository: TRepository & RequireKeyOf<TRepository>) {}

  /**
   * The tracked entity with this key, or one built from the repository's answer
   * and tracked from then on: only the first read of a key in a unit of work
   * reaches the repository, and concurrent reads of it share that one call.
   * `undefined` when there is none, or it was removed.
   *
   * @example
   * const order = await orders.findById('o-1');
   * const tariff = await tariffs.findById({ id: tariffId, tenant: tenantId }); // a repository keyed by more than the id
   */
  async findById(key: KeyOf<TRepository>): Promise<EntityOf<TRepository> | undefined> {
    const identity = identityOf(key);
    const tracked = this.entities.get(identity);
    if (tracked !== undefined) return tracked.isRemoved ? undefined : (tracked as EntityOf<TRepository>);
    const found = await this.read(identity, async () => {
      const stored = (await this.repository.findById(key)) as StateOf<TRepository> | undefined;
      return stored === undefined ? undefined : this.track(stored);
    });
    return found?.isRemoved ? undefined : found;
  }

  /**
   * `findById`, failing when there is nothing to answer.
   *
   * @throws {EntityNotFoundError} when the repository has no such record, or it was removed in this unit of work.
   */
  async findByIdOrFail(key: KeyOf<TRepository>): Promise<EntityOf<TRepository>> {
    const found = await this.findById(key);
    if (found === undefined) throw new EntityNotFoundError(this.repository.entityName, key);
    return found;
  }

  /**
   * The entities with these keys: the tracked ones from the identity map, the
   * rest read in one call to the repository's `findByIds` — or one `findById`
   * per key when it has none. Answers in the order of `keys`, each key once;
   * keys with no record, and ones removed in this unit of work, are left out.
   *
   * @example
   * const orders = await manager.findByIds(['o-1', 'o-2']);
   */
  async findByIds(keys: KeyOf<TRepository>[]): Promise<EntityOf<TRepository>[]> {
    const unique = [...new Map(keys.map((key) => [identityOf(key), key])).values()];
    const { findByIds } = this.repository;
    if (findByIds !== undefined) {
      const unread = unique.filter((key) => {
        const identity = identityOf(key);
        return !this.entities.has(identity) && !this.reading.has(identity);
      });
      if (unread.length > 0) {
        const batch = (findByIds as (keys: unknown[]) => Promise<StateOf<TRepository>[]>)
          .call(this.repository, unread)
          .then((records) => records.forEach((record) => this.track(record)));
        for (const key of unread) {
          const identity = identityOf(key);
          void this.read(identity, () => batch.then(() => this.entities.get(identity) as EntityOf<TRepository>)).catch(
            () => undefined,
          );
        }
      }
    }
    const found = await Promise.all(unique.map((key) => this.findById(key)));
    return found.filter((entity) => entity !== undefined) as EntityOf<TRepository>[];
  }

  /**
   * Tracks records read some other way — a list read on the repository, say. A
   * record already tracked answers its entity, with whatever this unit of work
   * changed in it, rather than what was just read; one it removed is left out.
   *
   * @example
   * for (const order of orders.trackMany(await orders.repository.findByCustomer('Ada'))) {
   *   order.cancel();
   * }
   */
  trackMany(records: StateOf<TRepository>[]): EntityOf<TRepository>[] {
    return records
      .filter((record) => !this.entities.get(this.identityOfRecord(record))?.isRemoved)
      .map((record) => this.track(record));
  }

  /** `trackMany` for one record. */
  track(record: StateOf<TRepository>): EntityOf<TRepository> {
    return (this.entities.get(this.identityOfRecord(record)) ?? this.attach(record, {})) as EntityOf<TRepository>;
  }

  /**
   * A record to create on the next commit, tracked from now on, so reads of its
   * key answer it. Its id is the caller's; to have the repository reserve one, use `add`.
   *
   * @example
   * const order = orders.create({ id: 'o-2', status: 'open', lines: [] });
   *
   * @throws {EntityIdentityError} when the key is tracked already, or was removed in this unit of work.
   */
  create(record: StateOf<TRepository>): EntityOf<TRepository> {
    const tracked = this.entities.get(this.identityOfRecord(record));
    if (tracked !== undefined) {
      const why = tracked.isRemoved
        ? 'was removed in this unit of work and cannot be created again in it'
        : 'is already tracked: change the tracked entity (findByIdOrFail) instead of creating it again';
      throw new EntityIdentityError(`${this.repository.entityName} ${String(record.id)} ${why}`);
    }
    return this.attach(record, { isNew: true }) as EntityOf<TRepository>;
  }

  /**
   * A record to create on the next commit, whose id its repository reserves
   * now: the value goes through the repository's `prepare`, and the record is
   * then tracked as `create` tracks it — so it has its id at once, and other
   * records can hold it before the commit.
   *
   * @example
   * const comment = await comments.add({ text: 'First!' });
   * post.state.commentId = comment.id;
   *
   * @throws {EntityIdentityError} when the repository has no `prepare`, or the id it reserved is tracked already.
   */
  async add(value: NewOf<TRepository>): Promise<EntityOf<TRepository>> {
    const { prepare } = this.repository as { prepare?: (value: unknown) => Promise<StateOf<TRepository>> };
    if (prepare === undefined) {
      throw new EntityIdentityError(
        `${this.repository.entityName} records cannot be added: their repository has no prepare to reserve an id. ` +
          'Register the repository with decorate(preparing(withId(IMyIdsToken))), or create the record with its id: create({ id, ... }).',
      );
    }
    return this.create(await prepare.call(this.repository, value));
  }

  /**
   * Deletes a tracked entity on the next commit; from now on its key reads as missing.
   *
   * @example
   * orders.remove(await orders.findByIdOrFail('o-1'));
   *
   * @throws {EntityNotFoundError} when the entity is not tracked by this manager.
   */
  remove(entity: Entity<StateOf<TRepository>>): void {
    this.assertTracked(entity);
    entity.remove();
  }

  /**
   * Stops tracking an entity: a commit ignores it, and the next read of its key
   * reaches the repository and answers a new entity. The entity itself is left
   * as it is.
   *
   * @throws {EntityNotFoundError} when the entity is not tracked by this manager.
   */
  detach(entity: Entity<StateOf<TRepository>>): void {
    this.assertTracked(entity);
    this.untrack(entity);
  }

  /**
   * Detaches every entity: the identity map starts over, and nothing is pending.
   *
   * @example
   * for (const chunk of chunks) {
   *   for (const row of chunk) (await rows.findByIdOrFail(row.id)).patch(row);
   *   await rows.flush();
   *   rows.clear(); // keep a long batch's identity map small
   * }
   */
  clear(): void {
    for (const entity of [...this.entities.values()]) this.untrack(entity);
  }

  /**
   * Re-reads a tracked entity by its key — after an optimistic-concurrency
   * conflict, say. What the repository answers becomes what is stored and
   * `state` (the same object), and what this unit of work changed in it is
   * dropped. Answers the entity, or `undefined` when its record is gone, in which
   * case it is no longer tracked.
   *
   * @throws {EntityNotFoundError} when the entity is new — nothing is stored to read — or not tracked by this manager.
   */
  async reload(entity: Entity<StateOf<TRepository>>): Promise<EntityOf<TRepository> | undefined> {
    const stored: StateOf<TRepository> | undefined = entity.getStored();
    if (!this.keys.has(entity) || stored === undefined) {
      throw new EntityNotFoundError(this.repository.entityName, entity.id);
    }
    const fresh = (await this.repository.findById(this.keyOfRecord(stored))) as StateOf<TRepository> | undefined;
    if (fresh === undefined) {
      this.untrack(entity);
      return undefined;
    }
    entity[markStored](fresh);
    return entity.revert() as EntityOf<TRepository>;
  }

  /** The tracked entities, in the order they were first tracked — removed ones included. */
  getTracked(): EntityOf<TRepository>[] {
    return [...this.entities.values()] as EntityOf<TRepository>[];
  }

  /** Whether a commit would write anything: a new, removed, or changed entity. */
  hasChanges(): boolean {
    return [...this.entities.values()].some((entity) => entity.hasChanges());
  }

  /**
   * What a commit would write for this repository, in the order the entities
   * were first tracked: each new entity created, each changed one updated with
   * its diff, each removed one deleted. Nothing is written. A `UnitOfWork`
   * orders them, with the other repositories' changes, by references.
   *
   * @example
   * for (const change of orders.getChanges()) audit.log(change.type, change.entity.id);
   */
  getChanges(): Change<StateOf<TRepository>, EntityOf<TRepository>>[] {
    const changes: Change<StateOf<TRepository>, EntityOf<TRepository>>[] = [];
    const { repository } = this;
    for (const tracked of this.entities.values()) {
      const entity = tracked as EntityOf<TRepository>;
      const stored = entity.getStored() as StateOf<TRepository> | undefined;
      if (entity.isRemoved) {
        if (stored !== undefined) changes.push({ type: 'delete', entity, repository, stored });
      } else if (stored === undefined) {
        changes.push({ type: 'create', entity, repository, record: entity.getDiff() as StateOf<TRepository> });
      } else {
        const diff = entity.getDiff() as Partial<StateOf<TRepository>>;
        if (Object.keys(diff).length > 0) changes.push({ type: 'update', entity, repository, stored, diff });
      }
    }
    return changes;
  }

  /**
   * Writes this repository's changes: creates and updates, then deletes, in the
   * order the entities were first tracked — `getChanges`. Only once every write
   * succeeded does what they answered become what is stored; when one throws,
   * nothing changes in memory and flushing again sends the same writes. Opens no
   * transaction. Answers the changes it wrote.
   *
   * To write several repositories in one commit, ordered by their references,
   * use `UnitOfWork.commit()`.
   *
   * @throws {EntityIdentityError} when an entity's `state.id`, or the rest of its key, was reassigned.
   */
  async flush(): Promise<Change<StateOf<TRepository>, EntityOf<TRepository>>[]> {
    this[checkIdentities]();
    const changes = orderChanges(this.getChanges() as Change[], () => []) as Change<
      StateOf<TRepository>,
      EntityOf<TRepository>
    >[];
    const flush = new Flush();
    for (const change of changes) await this[writeChange](change, flush);
    flush.commit();
    return changes;
  }

  /**
   * Refuses entities whose key changed since they were tracked.
   *
   * @throws {EntityIdentityError} when an entity's `state.id`, or the rest of its key, was reassigned.
   */
  [checkIdentities](): void {
    for (const [identity, entity] of this.entities) {
      const name = `${this.repository.entityName} ${String(entity.id)}`;
      if (entity.state.id !== entity.id) {
        throw new EntityIdentityError(
          `The id of ${name} was changed to ${String(entity.state.id)}. ` +
            'An id cannot change: create a new entity and remove this one.',
        );
      }
      const current = this.identityOfRecord(entity.state);
      if (current !== identity) {
        throw new EntityIdentityError(
          `The key of ${name} was changed from ${identity} to ${current}. ` +
            'A key cannot change: create a new entity and remove this one.',
        );
      }
    }
  }

  /** Writes one change through the repository, leaving what it changes in memory to `flush`'s commit. */
  async [writeChange](change: Change, flush: Flush): Promise<void> {
    const entity = change.entity as Entity<StateOf<TRepository>>;
    const repository: IRepository<StateOf<TRepository>> = this.repository;
    if (change.type === 'create') {
      const created = await repository.create(change.record as StateOf<TRepository>);
      flush.onCommit(() => entity[markStored](created));
    } else if (change.type === 'update') {
      const updated = await repository.update(
        change.stored as StateOf<TRepository>,
        change.diff as Partial<StateOf<TRepository>>,
      );
      flush.onCommit(() => entity[markStored](updated));
    } else {
      await repository.delete(change.stored as StateOf<TRepository>);
      flush.onCommit(() => this.untrack(entity));
    }
  }

  /** When the entity was first tracked, in one sequence shared by every manager. */
  [trackedAt](entity: Entity<StateOf<TRepository>>): number {
    return this.sequence.get(entity) ?? 0;
  }

  /** `load`, shared with every concurrent read of the same identity until it settles. */
  private read(
    identity: string,
    load: () => Promise<EntityOf<TRepository> | undefined>,
  ): Promise<EntityOf<TRepository> | undefined> {
    let reading = this.reading.get(identity);
    if (reading === undefined) {
      reading = load().finally(() => this.reading.delete(identity));
      this.reading.set(identity, reading);
    }
    return reading;
  }

  private attach(record: StateOf<TRepository>, options: EntityOptions): EntityOf<TRepository> {
    const EntityType = (this.repository.entityClass ?? Entity) as unknown as EntityClass<
      StateOf<TRepository>,
      EntityOf<TRepository>
    >;
    const entity = new EntityType(record, options);
    const identity = this.identityOfRecord(record);
    this.entities.set(identity, entity);
    this.keys.set(entity, identity);
    this.sequence.set(entity, ++tracking);
    return entity;
  }

  /** @throws {EntityNotFoundError} when the entity is not tracked by this manager. */
  private assertTracked(entity: Entity<StateOf<TRepository>>): void {
    if (!this.keys.has(entity)) throw new EntityNotFoundError(this.repository.entityName, entity.id);
  }

  private untrack(entity: Entity<StateOf<TRepository>>): void {
    const identity = this.keys.get(entity);
    if (identity !== undefined && this.entities.get(identity) === entity) this.entities.delete(identity);
    this.keys.delete(entity);
  }

  /** A record's key, as `findById` takes it: what the repository's `keyOf` answers, or its id. */
  private keyOfRecord(record: StateOf<TRepository>): KeyOf<TRepository> {
    return (this.repository.keyOf?.(record) ?? record.id) as KeyOf<TRepository>;
  }

  private identityOfRecord(record: StateOf<TRepository>): string {
    return identityOf(this.keyOfRecord(record));
  }
}

/** A key as a string the identity map can hold: equal keys — objects whatever their field order — give equal strings. */
function identityOf(key: unknown): string {
  return JSON.stringify(canonical(key));
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((field) => [field, canonical(value[field])]),
  );
}
