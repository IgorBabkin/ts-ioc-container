import { EntityIdentityError } from './errors';
import type { IEntity } from './IRepository';
import { type Linkable, Links } from './LazyRef';
import { isEqual, snapshot } from './snapshot';

/** How `EntityManager` records what a repository stored; not exported from the package, so only a flush moves what an entity diffs against. */
export const markStored = Symbol('markStored');

/** How `EntityManager` creates the records linked into an entity before writing it; not exported from the package. */
export const resolveReferences = Symbol('resolveReferences');

export interface EntityOptions {
  /** The record does not exist yet: it has nothing stored, and the next flush creates it. */
  isNew?: boolean;
}

/**
 * One tracked record: `state` is the DTO, read and changed in place — nested
 * values included — and a snapshot of what is stored is kept beside it.
 * `getDiff` compares the two field by field, so there is nothing to call when a
 * field is set; `patch` sets several at once.
 *
 * Extend it to give a record its own behaviour, and name the class as the
 * repository's `entityClass` so the entity manager builds it:
 *
 * ```ts
 * class Order extends Entity<OrderDto> {
 *   cancel(): void {
 *     this.state.status = 'cancelled';
 *   }
 * }
 * ```
 */
export class Entity<State extends IEntity = IEntity> {
  readonly state: State;
  private stored: State | undefined;
  private removed = false;
  private readonly links = new Links<State>();

  constructor(state: State, { isNew = false }: EntityOptions = {}) {
    this.state = snapshot(state);
    this.stored = isNew ? undefined : snapshot(state);
  }

  get id(): State['id'] {
    return (this.stored ?? this.state).id;
  }

  get isNew(): boolean {
    return this.stored === undefined;
  }

  get isRemoved(): boolean {
    return this.removed;
  }

  /** What is stored, as last read or flushed; `undefined` for a new entity. */
  getStored(): State | undefined {
    return this.stored === undefined ? undefined : snapshot(this.stored);
  }

  /**
   * The fields of `state` that differ from what is stored — all of them for a
   * new entity. A field `state` no longer has is in it as `undefined`.
   */
  getDiff(): Partial<State> {
    const stored = this.stored;
    if (stored === undefined) return snapshot({ ...this.state });
    const keys = new Set([...Object.keys(stored), ...Object.keys(this.state)]) as Set<keyof State>;
    return snapshot(
      Object.fromEntries(
        [...keys].filter((key) => !isEqual(this.state[key], stored[key])).map((key) => [key, this.state[key]]),
      ) as Partial<State>,
    );
  }

  hasChanges(): boolean {
    return this.removed || this.isNew || this.links.size > 0 || Object.keys(this.getDiff()).length > 0;
  }

  /**
   * Sets the given fields of `state` — `undefined` included — and leaves the
   * rest as they are. The `id` cannot be patched to another value.
   */
  patch(changes: Partial<State>): this {
    if (changes.id !== undefined && changes.id !== this.id) {
      throw new EntityIdentityError(`The id of ${String(this.id)} cannot be patched to ${String(changes.id)}`);
    }
    Object.assign(this.state, snapshot(changes));
    return this;
  }

  /** What the repository stored becomes `state` — the same object, for whoever holds it — and what the diff compares against. */
  /**
   * Sets `field`, when this entity is flushed, to the id of a record that does
   * not exist yet — created then, first. Until the flush `state` keeps what it
   * holds; a later `link` of the same field replaces this one.
   *
   * ```ts
   * post.link('commentId', comments.lazy({ text: 'First!' }));
   * ```
   */
  link<K extends keyof State>(field: K, ref: Linkable<State[K]>): this {
    this.links.set(field, ref);
    return this;
  }

  async [resolveReferences](): Promise<void> {
    await this.links.resolveInto(this.state);
  }

  [markStored](stored: State): void {
    for (const key of Object.keys(this.state)) {
      if (!Object.hasOwn(stored, key)) delete (this.state as Record<string, unknown>)[key];
    }
    Object.assign(this.state, snapshot(stored));
    this.stored = snapshot(stored);
  }

  remove(): void {
    this.removed = true;
  }
}

/** A class `EntityManager` can build an entity with: `Entity` or a subclass of it. */
export interface EntityClass<State extends IEntity, E = Entity<State>> {
  new (state: State, options?: EntityOptions): E;
}
