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

import { Entity, type EntityClass, type EntityOptions, markStored, resolveReferences } from './Entity';
import { EntityIdentityError, EntityManagerArgumentError, EntityNotFoundError } from './errors';
import {
  type AnyRepository,
  type EntityOf,
  type IEntity,
  type IRepository,
  isRepositoryToken,
  type StateOf,
  type ValueOf,
} from './IRepository';
import { LazyRef } from './LazyRef';

/** What `flushEntityManagers` needs of an entity manager. */
export interface IEntityManager {
  /** Writes every pending create, change, and removal through the repository, in the order the entities were first tracked. */
  flush(): Promise<void>;
}

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
  private readonly entities = new Map<StateOf<TRepository>['id'], Entity<StateOf<TRepository>>>();

  constructor(@inject(byArgs(repositoryTokenArg)) readonly repository: TRepository) {}

  /**
   * The tracked entity with this id, or one built from the repository's answer
   * and tracked from then on: only the first read of an id in a unit of work
   * reaches the repository. The arguments after the id are the rest of its key
   * and go to the repository as given. `undefined` when there is none, or it was removed.
   *
   * @example
   * const order = await orders.findById('o-1');
   * const tariff = await tariffs.findById(tariffId, tenantId); // a repository keyed by more than the id
   */
  async findById(...args: Parameters<TRepository['findById']>): Promise<EntityOf<TRepository> | undefined> {
    const [id] = args as unknown as [StateOf<TRepository>['id']];
    const tracked = this.entities.get(id);
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
   */
  async findByIdOrFail(...args: Parameters<TRepository['findById']>): Promise<EntityOf<TRepository>> {
    const found = await this.findById(...args);
    if (found === undefined) throw new EntityNotFoundError(this.repository.entityName, args[0]);
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
    return records.filter((record) => !this.entities.get(record.id)?.isRemoved).map((record) => this.track(record));
  }

  /** `trackMany` for one record. */
  track(record: StateOf<TRepository>): EntityOf<TRepository> {
    return (this.entities.get(record.id) ?? this.add(record, {})) as EntityOf<TRepository>;
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
    const tracked = this.entities.get(record.id);
    if (tracked !== undefined) {
      const why = tracked.isRemoved
        ? 'was removed in this unit of work and cannot be created again in it'
        : 'is already tracked: change the tracked entity (findByIdOrFail) instead of creating it again';
      throw new EntityIdentityError(`${this.repository.entityName} ${String(record.id)} ${why}`);
    }
    return this.add(record, { isNew: true }) as EntityOf<TRepository>;
  }

  /**
   * A record to create only if, and when, an entity it is `link`ed into is
   * flushed. It is created through the repository — the records linked into
   * it first — tracked as stored, and the linking field gets its id. `value`
   * is copied now.
   *
   * ```ts
   * post.link('commentId', comments.lazy({ text: 'First!' }));
   * ```
   */
  lazy(value: ValueOf<TRepository>): LazyRef<EntityOf<TRepository>, ValueOf<TRepository>> {
    return new LazyRef(value, async (created) =>
      this.track((await this.repository.create(created)) as StateOf<TRepository>),
    );
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
    const tracked = this.entities.get(entity.id);
    if (tracked === undefined) throw new EntityNotFoundError(this.repository.entityName, entity.id);
    tracked.remove();
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
   * @throws {EntityIdentityError} when an entity's `state.id` was reassigned.
   * @throws {EntityReferenceError} when linked lazy records form a cycle.
   */
  async flush(): Promise<void> {
    for (const entity of [...this.entities.values()]) {
      await this.persist(entity, this.repository);
    }
  }

  private async persist<S extends IEntity>(entity: Entity<S>, repository: IRepository<S>): Promise<void> {
    if (entity.state.id !== entity.id) {
      throw new EntityIdentityError(
        `The id of ${repository.entityName} ${String(entity.id)} was changed to ${String(entity.state.id)}. ` +
          'An id cannot change: create a new entity and remove this one.',
      );
    }
    const stored = entity.getStored();
    if (entity.isRemoved) {
      if (stored !== undefined) await repository.delete(stored);
      this.entities.delete(entity.id);
      return;
    }
    await entity[resolveReferences]();
    if (stored === undefined) {
      entity[markStored](await repository.create(entity.state));
    } else {
      const diff = entity.getDiff();
      if (Object.keys(diff).length > 0) entity[markStored](await repository.update(stored, diff));
    }
  }

  private add(record: StateOf<TRepository>, options: EntityOptions): EntityOf<TRepository> {
    const EntityType = (this.repository.entityClass ?? Entity) as unknown as EntityClass<
      StateOf<TRepository>,
      EntityOf<TRepository>
    >;
    const entity = new EntityType(record, options);
    this.entities.set(entity.id, entity);
    return entity;
  }
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
 * @example
 * try {
 *   const response = await route.handle(payload);
 *   await db.transaction(() => flushEntityManagers(requestScope));
 *   return response;
 * } finally {
 *   requestScope.dispose();
 * }
 */
export async function flushEntityManagers(scope: IContainer): Promise<void> {
  for (const manager of scope.getInstances().filter(isEntityManager)) {
    await manager.flush();
  }
}
