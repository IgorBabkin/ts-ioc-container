import type { InjectionToken } from 'ts-ioc-container';

import type { Entity, EntityClass } from './Entity';

/** Any record with an id. */
export interface IEntity {
  readonly id: string | number;
}

/**
 * What an `EntityManager` reads and writes through: the calls a unit of work
 * needs, and nothing about querying.
 *
 * `Key` is what a record is read by: its id by default, or an object — a
 * tenant's record, say: `{ id, tenant }`. When the key is more than the id,
 * `keyOf` names a record's key, and `EntityManager` and `UnitOfWork.of`
 * require it.
 *
 * @example
 * export const IOrderRepositoryToken = new SingleToken<OrderRepository>('IOrderRepository');
 *
 * @register(IOrderRepositoryToken, scope((s) => s.hasTag('application')), singleton())
 * export class OrderRepository implements IRepository<OrderDto, Order> {
 *   readonly entityName = 'Order';
 *   readonly entityClass = Order;
 *   findById(id: string) { ... }                                // SELECT
 *   create(order: OrderDto) { ... }                              // INSERT, answer the row
 *   update(stored: OrderDto, diff: Partial<OrderDto>) { ... }    // UPDATE only the diff
 *   delete(stored: OrderDto) { ... }                             // DELETE
 * }
 */
export interface IRepository<
  State extends IEntity = IEntity,
  E extends Entity<State> = Entity<State>,
  Key = State['id'],
> {
  /** What a missing record is called: `Order` in `Order o-1 was not found.` */
  readonly entityName: string;

  /** The class the entity manager builds this repository's entities with; `Entity` when left out. */
  readonly entityClass?: EntityClass<State, E>;

  /**
   * Which fields hold ids of which repository's records — one id, or an array
   * of ids. A unit of work writes a record after the new records it references,
   * and deletes it before the deleted records it references, so foreign keys
   * need not be deferred.
   *
   * @example
   * readonly references = { authorId: IAuthorRepositoryToken, tagIds: ITagRepositoryToken };
   */
  readonly references?: { readonly [K in keyof State]?: InjectionToken<AnyRepository> };

  /**
   * Turns a value into a new record — its id reserved, and whatever else a new
   * record needs — for `EntityManager.add`. Usually woven in where the
   * repository is registered, rather than written: `decorate(preparing(withId(IOrderIdsToken)))`.
   */
  prepare?(value: never): Promise<State>;

  /**
   * A record's key, as `findById` takes it. Required when the key is more than
   * the id — an entity manager over a repository without it does not compile.
   */
  keyOf?(record: State): Key;

  /** The record with this key, or `undefined` when there is none. */
  findById(key: Key): Promise<State | undefined>;

  /**
   * The records with these keys, in any order — `WHERE id IN (...)`. Keys with
   * no record are left out. Optional: without it, `EntityManager.findByIds`
   * reads one key at a time.
   */
  findByIds?(keys: Key[]): Promise<State[]>;

  /** Inserts the record — its id included — and answers the row as stored. */
  create(record: State): Promise<State>;

  /** `stored` is the record as the unit of work read it; `diff` holds only the fields that differ from it. */
  update(stored: State, diff: Partial<State>): Promise<State>;

  delete(stored: State): Promise<void>;
}

/**
 * Any repository, whatever its record, entity and key: the constraint an entity
 * manager places on the repository it works over.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRepository = IRepository<any, any, any>;

/**
 * What `EntityManager` and `UnitOfWork.of` require of a repository on top of
 * `IRepository`: `keyOf`, when its key is more than the id. A repository
 * without it fails to compile, naming what is missing.
 */
export type RequireKeyOf<TRepository> = [KeyOf<TRepository>] extends [StateOf<TRepository>['id']]
  ? unknown
  : TRepository extends { keyOf(record: never): unknown }
    ? unknown
    : { readonly 'keyOf is required: the key is more than the id': never };

/** The record a repository answers with. */
export type StateOf<TRepository> = TRepository extends { create(record: infer State extends IEntity): unknown }
  ? State
  : never;

/** What a repository reads a record by: its id, or the key `keyOf` answers. */
export type KeyOf<TRepository> = TRepository extends { findById(key: infer Key): unknown } ? Key : never;

/** The entity an entity manager over the repository answers with: its `entityClass`, or `Entity`. */
export type EntityOf<TRepository> = TRepository extends { readonly entityClass?: EntityClass<never, infer E> }
  ? unknown extends E
    ? Entity<StateOf<TRepository>>
    : E
  : Entity<StateOf<TRepository>>;

/**
 * What `EntityManager.add` takes: what the repository's `prepare` takes when its
 * class declares one, or else the record without its id. A `prepare` woven in
 * by `preparing` is not declared by the class; to type what it takes, declare it:
 *
 * ```ts
 * declare readonly prepare: (order: NewOrder) => Promise<OrderDto>;
 * ```
 */
export type NewOf<TRepository> = TRepository extends { prepare(value: infer New): Promise<unknown> }
  ? New
  : Omit<StateOf<TRepository>, 'id'>;
