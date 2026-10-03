import {
  bindTo,
  byArgs,
  findArgOrFail,
  type IContainer,
  inject,
  type InjectionToken,
  register,
  SingleToken,
  singleton,
} from 'ts-ioc-container';

import { Entity, type EntityClass, type EntityOptions, markStored } from './Entity';
import { EntityIdentityError, EntityNotFoundError } from './errors';
import { type AnyRepository, type EntityOf, type IRepository, isRepositoryToken, type StateOf } from './IRepository';

export interface IEntityManager {
  /** Writes every pending create, change, and removal through the repository, in the order the entities were first tracked. */
  flush(): Promise<void>;
}

export const IEntityManagerToken = new SingleToken<IEntityManager>('IEntityManager');

const repositoryTokenArg = findArgOrFail<InjectionToken<AnyRepository>>(isRepositoryToken);

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
 * request: `R.fromClass(EntityManager).when((s) => s.hasTag('request'))`.
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

  /** `findById`, failing with `EntityNotFoundError` when there is nothing to answer. */
  async findByIdOrFail(...args: Parameters<TRepository['findById']>): Promise<EntityOf<TRepository>> {
    const found = await this.findById(...args);
    if (found === undefined) throw new EntityNotFoundError(this.repository.entityName, args[0]);
    return found;
  }

  /**
   * Tracks records read some other way — a list read on the repository, say. A
   * record already tracked answers its entity, with whatever this unit of work
   * changed in it, rather than what was just read; one it removed is left out.
   */
  trackMany(records: StateOf<TRepository>[]): EntityOf<TRepository>[] {
    return records.filter((record) => !this.entities.get(record.id)?.isRemoved).map((record) => this.track(record));
  }

  /** `trackMany` for one record. */
  track(record: StateOf<TRepository>): EntityOf<TRepository> {
    return (this.entities.get(record.id) ?? this.add(record, {})) as EntityOf<TRepository>;
  }

  /** A record to create on the next `flush`, tracked from now on, so reads of its id answer it. */
  create(record: StateOf<TRepository>): EntityOf<TRepository> {
    const tracked = this.entities.get(record.id);
    if (tracked !== undefined) {
      const why = tracked.isRemoved ? 'was removed in this unit of work' : 'is already tracked';
      throw new EntityIdentityError(`${this.repository.entityName} ${String(record.id)} ${why}`);
    }
    return this.add(record, { isNew: true }) as EntityOf<TRepository>;
  }

  /** Deletes a tracked entity on the next `flush`; from now on its id reads as missing. */
  remove(entity: Entity<StateOf<TRepository>>): void {
    const tracked = this.entities.get(entity.id);
    if (tracked === undefined) throw new EntityNotFoundError(this.repository.entityName, entity.id);
    tracked.remove();
  }

  hasChanges(): boolean {
    return [...this.entities.values()].some((entity) => entity.hasChanges());
  }

  async flush(): Promise<void> {
    for (const entity of [...this.entities.values()]) {
      await this.persist(entity, this.repository);
    }
  }

  private async persist(entity: Entity, repository: IRepository): Promise<void> {
    if (entity.state.id !== entity.id) {
      throw new EntityIdentityError(
        `The id of ${repository.entityName} ${String(entity.id)} was changed to ${String(entity.state.id)}`,
      );
    }
    const stored = entity.getStored();
    if (entity.isRemoved) {
      if (stored !== undefined) await repository.delete(stored);
      this.entities.delete(entity.id);
    } else if (stored === undefined) {
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

export const isEntityManager = (value: unknown): value is EntityManager => value instanceof EntityManager;

/** The token an `EntityManager` over the repository behind `repositoryToken` is resolved by. */
export const entityManagerToken = <TRepository extends AnyRepository>(
  repositoryToken: InjectionToken<TRepository>,
): InjectionToken<EntityManager<TRepository>> =>
  IEntityManagerToken.args(repositoryToken) as unknown as InjectionToken<EntityManager<TRepository>>;

/**
 * Flushes every entity manager `scope` built, one after another, in the order
 * they were built — the commit of a unit of work. Run it inside the
 * transaction that should hold the writes; it opens none of its own.
 */
export async function flushEntityManagers(scope: IContainer): Promise<void> {
  for (const manager of scope.getInstances().filter(isEntityManager)) {
    await manager.flush();
  }
}
