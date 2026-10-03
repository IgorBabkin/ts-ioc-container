import { type DependencyKey, type InjectionToken, isInjectionToken, SingleToken } from 'ts-ioc-container';

import type { Entity, EntityClass } from './Entity';

/** Any record with an id. The id is what the identity map keys it by. */
export interface IEntity {
  readonly id: string | number;
}

/**
 * What an `EntityManager` reads and writes through: the calls a unit of work
 * needs, and nothing about querying. A record keyed by more than its id — a
 * tenant's record, say — takes the rest of its key after the id when read,
 * and off the record itself when written.
 *
 * `Value` is what `create` takes: the state itself when the caller mints ids,
 * or the state without its id when the database does — which is what
 * `EntityManager.lazy` needs.
 */
export interface IRepository<State extends IEntity = IEntity, E extends Entity<State> = Entity<State>, Value = State> {
  /** What a missing record is called: `Order` in `Order o-1 was not found.` */
  readonly entityName: string;

  /** The class the entity manager builds this repository's entities with; `Entity` when left out. */
  readonly entityClass?: EntityClass<State, E>;

  /** The record, or `undefined` when there is none. */
  findById(id: State['id'], ...key: never[]): Promise<State | undefined>;

  create(value: Value): Promise<State>;

  /** `stored` is the record as the unit of work read it; `diff` holds only the fields that differ from it. */
  update(stored: State, diff: Partial<State>): Promise<State>;

  delete(stored: State): Promise<void>;
}

/**
 * Any repository, whatever its record and entity: the constraint an entity
 * manager places on the repository it works over. `entityClass` takes the
 * record as a constructor argument, which a stricter bound would reject.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRepository = IRepository<any, any, any>;

/** The record a repository answers with. */
export type StateOf<TRepository> = TRepository extends IRepository<infer S, infer _E, infer _V> ? S : never;

/** The entity an entity manager over the repository answers with: its `entityClass`, or `Entity`. */
export type EntityOf<TRepository> = TRepository extends IRepository<infer _S, infer E, infer _V> ? E : never;

/** What the repository's `create` takes — and so what `EntityManager.lazy` takes. */
export type ValueOf<TRepository> = TRepository extends IRepository<infer _S, infer _E, infer V> ? V : never;

const REPOSITORY_TAG = 'repository';

/** A token for a repository, tagged so `EntityManager` can pick it out of the args it is resolved with. */
export const repositoryToken = <TRepository extends AnyRepository>(key: DependencyKey): SingleToken<TRepository> =>
  new SingleToken<TRepository>(key, { tags: [REPOSITORY_TAG] });

export const isRepositoryToken = (value: unknown): value is InjectionToken<AnyRepository> =>
  isInjectionToken(value) && value.hasTag(REPOSITORY_TAG);
