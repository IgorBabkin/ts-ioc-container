import {
  bindTo,
  byArgs,
  type IContainer,
  inject,
  type InjectionToken,
  register,
  SingleToken,
  singleton,
} from 'ts-ioc-container';

import { Entity, type EntityClass, type EntityOptions, markStored, resolveLinks } from './Entity';
import { EntityIdentityError, EntityManagerArgumentError, EntityNotFoundError } from './errors';
import {
  type AnyRepository,
  type EntityOf,
  type IRepository,
  isRepositoryToken,
  type NewOf,
  type RecordKey,
  type StateOf,
  type ValueOf,
} from './IRepository';
import { Flush } from './Flush';
import { LazyRef } from './LazyRef';
import { diff } from './snapshot';

/** What `flushEntityManagers` needs of an entity manager. */
export interface IEntityManager {
  /** Writes every pending create, change, and removal through the repository, in the order the entities were first tracked. */
  flush(): Promise<void>;
}

/** How `flushEntityManagers` writes several managers in one commit; not exported from the package. */
export const writeIn = Symbol('writeIn');

/**
 * The token every `EntityManager` is registered under. Do not resolve it on its
 * own: resolve `entityManagerToken(repositoryToken)`, which passes the repository.
 */
export const IEntityManagerToken = new SingleToken<IEntityManager>('IEntityManager');

function repositoryTokenArg(args: unknown[] = []): InjectionToken<AnyRepository> {
  const token = args.find(isRepositoryToken);
  if (token === undefined) throw new EntityManagerArgumentError();
  return token;
}

/**
 * The unit of work over one repository: an identity map, so each record is read
 * once and every read of its id answers the same entity, and a `flush` that
 * writes each entity's `getDiff()`, taking what the repository answers as stored.
 * Entities are built with the repository's `entityClass`, so a subclass's own
 * methods are there on everything this answers.
 *
 * Resolved with the repository's token as its argument, and cached per token:
 * `entityManagerToken(IOrderRepositoryToken)` in the same scope always meets
 * the same map. Register it in the scope a unit of work lives in, e.g. one per
 * request — without a scope rule it would be shared by every scope.
 *
 * @example
 * const app = new Container({ tags: ['application'] })
 *   .addRegistration(R.fromClass(OrderRepository))
 *   .addRegistration(R.fromClass(EntityManager).when((s) => s.hasTag('request')));
 *
 * const request = app.createScope({ tags: ['request'] });
 * const orders = entityManagerToken(IOrderRepositoryToken).resolve(request);
 * const order = await orders.findByIdOrFail('o-1');
 * order.state.status = 'cancelled';
 * await db.transaction(() => flushEntityManagers(request));
 *
 * @throws {EntityManagerArgumentError} when resolved without a token made by `repositoryToken`.
 */
@register(bindTo(IEntityManagerToken), singleton(repositoryTokenArg))
export class EntityManager<TRepository extends AnyRepository = AnyRepository> implements IEntityManager {
  /** Tracked entities by the identity of their key, in the order they were first tracked. */
  private readonly entities = new Map<string, Entity<StateOf<TRepository>>>();
  private readonly keys = new WeakMap<Entity<StateOf<TRepository>>, string>();

  constructor(@inject(byArgs(repositoryTokenArg)) readonly repository: TRepository) {}

  /**
   * The tracked entity with this id, or one built from the repository's answer
   * and tracked from then on: only the first read of a key in a unit of work
   * reaches the repository. The arguments after the id are the rest of its key —
   * what the repository's `keyOf` answers — and go to the repository as given.
   * `undefined` when there is none, or it was removed.
   *
   * @example
   * const order = await orders.findById('o-1');
   * const tariff = await tariffs.findById(tariffId, tenantId); // a repository keyed by more than the id
   *
   * @throws {EntityIdentityError} when read by more than the id from a repository without `keyOf`.
   */
  async findById(...args: Parameters<TRepository['findById']>): Promise<EntityOf<TRepository> | undefined> {
    const tracked = this.entities.get(this.identityOfArgs(args));
    if (tracked !== undefined) return tracked.isRemoved ? undefined : (tracked as EntityOf<TRepository>);
    const stored = await (this.repository.findById as (...key: unknown[]) => Promise<StateOf<TRepository> | undefined>)(
      ...args,
    );
    return stored === undefined ? undefined : this.track(stored);
  }

  /**
   * `findById`, failing when there is nothing to answer.
   *
   * @throws {EntityNotFoundError} when the repository has no such record, or it was removed in this unit of work.
   * @throws {EntityIdentityError} when read by more than the id from a repository without `keyOf`.
   */
  async findByIdOrFail(...args: Parameters<TRepository['findById']>): Promise<EntityOf<TRepository>> {
    const found = await this.findById(...args);
    if (found === undefined) {
      const [id, ...rest] = args as unknown as RecordKey;
      throw new EntityNotFoundError(this.repository.entityName, id, ...rest);
    }
    return found;
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
      .filter((record) => !this.entities.get(this.identityOf(record))?.isRemoved)
      .map((record) => this.track(record));
  }

  /** `trackMany` for one record. */
  track(record: StateOf<TRepository>): EntityOf<TRepository> {
    return (this.entities.get(this.identityOf(record)) ?? this.attach(record, {})) as EntityOf<TRepository>;
  }

  /**
   * A record to create on the next `flush`, tracked from now on, so reads of its
   * id answer it. Its id is the caller's; for an id the database mints, use `lazy`.
   *
   * @example
   * const order = orders.create({ id: 'o-2', status: 'open', lines: [] });
   *
   * @throws {EntityIdentityError} when the id is tracked already, or was removed in this unit of work.
   */
  create(record: StateOf<TRepository>): EntityOf<TRepository> {
    const tracked = this.entities.get(this.identityOf(record));
    if (tracked !== undefined) {
      const why = tracked.isRemoved
        ? 'was removed in this unit of work and cannot be created again in it'
        : 'is already tracked: change the tracked entity (findByIdOrFail) instead of creating it again';
      throw new EntityIdentityError(`${this.repository.entityName} ${String(record.id)} ${why}`);
    }
    return this.attach(record, { isNew: true }) as EntityOf<TRepository>;
  }

  /**
   * A record to create on the next `flush`, whose id its repository reserves
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
   * A record to create only if, and when, an entity it is `link`ed into is
   * flushed. It is created through the repository — the records linked into
   * it first — tracked as stored once the flush commits, and the linking field
   * gets its id. `value` is copied now.
   *
   * ```ts
   * post.link('commentId', comments.lazy({ text: 'First!' }));
   * ```
   */
  lazy(value: ValueOf<TRepository>): LazyRef<EntityOf<TRepository>, ValueOf<TRepository>> {
    return new LazyRef(value, async (created) => {
      const stored = (await this.repository.create(created)) as StateOf<TRepository>;
      return { id: stored.id, adopt: () => this.track(stored) };
    });
  }

  /**
   * Deletes a tracked entity on the next `flush`; from now on its id reads as missing.
   *
   * @example
   * orders.remove(await orders.findByIdOrFail('o-1'));
   *
   * @throws {EntityNotFoundError} when the entity is not tracked by this manager.
   */
  remove(entity: Entity<StateOf<TRepository>>): void {
    if (!this.keys.has(entity)) throw new EntityNotFoundError(this.repository.entityName, entity.id);
    entity.remove();
  }

  /** Whether a `flush` would write anything: a new, removed, linked, or changed entity. */
  hasChanges(): boolean {
    return [...this.entities.values()].some((entity) => entity.hasChanges());
  }

  /**
   * Writes every tracked entity that has changes — creates, updates with only
   * the changed fields, deletes — in the order they were first tracked, creating
   * the records linked into each first. Opens no transaction: call it inside one,
   * usually through `flushEntityManagers(scope)`.
   *
   * Only once every write succeeded does what they answered become what is
   * stored. When one throws — and the transaction rolls back — nothing changes
   * in memory: every entity is still pending, and flushing again sends the same writes.
   *
   * @throws {EntityIdentityError} when an entity's `state.id`, or the rest of its key, was reassigned.
   * @throws {EntityReferenceError} when linked lazy records form a cycle.
   */
  async flush(): Promise<void> {
    const flush = new Flush();
    await this[writeIn](flush);
    flush.commit();
  }

  /**
   * Writes every tracked entity in `flush`, leaving what changes in memory to its commit.
   *
   * @throws {EntityIdentityError} when an entity's `state.id`, or the rest of its key, was reassigned.
   * @throws {EntityReferenceError} when linked lazy records form a cycle.
   */
  async [writeIn](flush: Flush): Promise<void> {
    for (const entity of [...this.entities.values()]) {
      await this.write(entity, flush);
    }
  }

  /**
   * @throws {EntityIdentityError} when the entity's `state.id`, or the rest of its key, was reassigned.
   * @throws {EntityReferenceError} when linked lazy records form a cycle.
   */
  private async write(entity: Entity<StateOf<TRepository>>, flush: Flush): Promise<void> {
    const repository: IRepository<StateOf<TRepository>> = this.repository;
    const name = `${repository.entityName} ${String(entity.id)}`;
    if (entity.state.id !== entity.id) {
      throw new EntityIdentityError(
        `The id of ${name} was changed to ${String(entity.state.id)}. ` +
          'An id cannot change: create a new entity and remove this one.',
      );
    }
    const identity = this.keys.get(entity)!;
    if (this.identityOf(entity.state) !== identity) {
      throw new EntityIdentityError(
        `The key of ${name} was changed from ${identity} to ${this.identityOf(entity.state)}. ` +
          'A key cannot change: create a new entity and remove this one.',
      );
    }
    const stored = entity.getStored();
    if (entity.isRemoved) {
      if (stored !== undefined) await repository.delete(stored);
      flush.onCommit(() => {
        this.entities.delete(identity);
        this.keys.delete(entity);
      });
      return;
    }
    if (!entity.hasChanges()) return;
    const state = await entity[resolveLinks](flush);
    if (stored === undefined) {
      const created = await repository.create(state);
      flush.onCommit(() => entity[markStored](created));
      return;
    }
    const changes = diff(stored, state);
    const updated = Object.keys(changes).length > 0 ? await repository.update(stored, changes) : stored;
    flush.onCommit(() => entity[markStored](updated));
  }

  private attach(record: StateOf<TRepository>, options: EntityOptions): EntityOf<TRepository> {
    const EntityType = (this.repository.entityClass ?? Entity) as unknown as EntityClass<
      StateOf<TRepository>,
      EntityOf<TRepository>
    >;
    const entity = new EntityType(record, options);
    const identity = this.identityOf(record);
    this.entities.set(identity, entity);
    this.keys.set(entity, identity);
    return entity;
  }

  /** The identity-map key of a record: its whole key, as the repository's `keyOf` answers it, or its id. */
  private identityOf(record: StateOf<TRepository>): string {
    return identityOfKey(this.repository.keyOf?.(record) ?? [record.id]);
  }

  /**
   * The identity-map key `findById` reads by.
   *
   * @throws {EntityIdentityError} when read by more than the id from a repository without `keyOf`.
   */
  private identityOfArgs(args: unknown[]): string {
    if (args.length > 1 && this.repository.keyOf === undefined) {
      throw new EntityIdentityError(
        `${this.repository.entityName} was read by more than its id, but its repository has no keyOf, so the ` +
          'identity map cannot tell records with the same id apart. Give the repository keyOf(record), ' +
          'answering the arguments findById takes: [record.id, ...the rest of the key].',
      );
    }
    return identityOfKey(args as unknown as RecordKey);
  }
}

/** Key parts are primitives, so their JSON tells keys apart — `1` from `'1'` included. */
function identityOfKey(key: RecordKey): string {
  return JSON.stringify(key);
}

/** Whether `value` is an `EntityManager` — how `flushEntityManagers` finds them among a scope's instances. */
export const isEntityManager = (value: unknown): value is EntityManager => value instanceof EntityManager;

/**
 * The token the `EntityManager` over the repository behind `repositoryToken` is
 * resolved by — one per repository token per scope.
 *
 * @example
 * const orders = entityManagerToken(IOrderRepositoryToken).resolve(requestScope);
 * // or injected:
 * constructor(@inject(by(entityManagerToken(IOrderRepositoryToken))) private readonly orders: EntityManager<OrderRepository>) {}
 */
export const entityManagerToken = <TRepository extends AnyRepository>(
  repositoryToken: InjectionToken<TRepository>,
): InjectionToken<EntityManager<TRepository>> =>
  IEntityManagerToken.args(repositoryToken) as unknown as InjectionToken<EntityManager<TRepository>>;

/**
 * Flushes every entity manager `scope` built, one after another, in the order
 * they were built — the commit of a unit of work. Run it inside the
 * transaction that should hold the writes; it opens none of its own.
 *
 * All or nothing in memory: when a write fails, no manager — not even one
 * whose writes all succeeded — takes anything as stored, so once the
 * transaction rolls back the whole commit can be retried.
 *
 * @example
 * try {
 *   const response = await route.handle(payload);
 *   await db.transaction(() => flushEntityManagers(requestScope));
 *   return response;
 * } finally {
 *   requestScope.dispose();
 * }
 *
 * @throws {EntityIdentityError} when an entity's `state.id`, or the rest of its key, was reassigned.
 * @throws {EntityReferenceError} when linked lazy records form a cycle.
 */
export async function flushEntityManagers(scope: IContainer): Promise<void> {
  const flush = new Flush();
  for (const manager of scope.getInstances().filter(isEntityManager)) {
    await manager[writeIn](flush);
  }
  flush.commit();
}
