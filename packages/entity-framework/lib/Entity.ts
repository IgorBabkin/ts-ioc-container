import { EntityIdentityError } from './errors';
import type { IEntity } from './IRepository';
import type { Flush } from './Flush';
import { type Linkable, Links } from './LazyRef';
import { diff, snapshot } from './snapshot';

/** How `EntityManager` records what a repository stored; not exported from the package, so only a flush moves what an entity diffs against. */
export const markStored = Symbol('markStored');

/** How `EntityManager` reads what to write — `state` with its links resolved; not exported from the package. */
export const resolveLinks = Symbol('resolveLinks');

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
  private readonly trackedId: State['id'];

  constructor(state: State, { isNew = false }: EntityOptions = {}) {
    this.state = snapshot(state);
    this.stored = isNew ? undefined : snapshot(state);
    this.trackedId = state.id;
  }

  /** The id the entity was tracked under — what is stored, not a reassigned `state.id`. */
  get id(): State['id'] {
    return this.trackedId;
  }

  /** Not stored yet: the next flush creates it. */
  get isNew(): boolean {
    return this.stored === undefined;
  }

  /** Marked for deletion: the next flush deletes it. */
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
    return this.stored === undefined ? snapshot({ ...this.state }) : diff(this.stored, this.state);
  }

  /** Whether a flush would write it: new, removed, linked, or with a non-empty diff. */
  hasChanges(): boolean {
    return this.removed || this.isNew || this.links.size > 0 || Object.keys(this.getDiff()).length > 0;
  }

  /**
   * Sets the given fields of `state` — `undefined` included — and leaves the
   * rest as they are. Answers the entity, so calls chain.
   *
   * @example
   * order.patch({ status: 'cancelled', note: undefined });
   *
   * @throws {EntityIdentityError} when the patch names another `id`.
   */
  patch(changes: Partial<State>): this {
    if (changes.id !== undefined && changes.id !== this.id) {
      throw new EntityIdentityError(
        `The id of ${String(this.id)} cannot be patched to ${String(changes.id)}: leave id out of the patch.`,
      );
    }
    Object.assign(this.state, snapshot(changes));
    return this;
  }

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

  /** A copy of `state` with every linked field set to the id its record got in `flush`; `state` is left as it is. */
  [resolveLinks](flush: Flush): Promise<State> {
    return this.links.resolve(this.state, flush);
  }

  /**
   * What the repository stored becomes `state` — the same object, for whoever
   * holds it — and what the diff compares against; the links it resolved are done.
   */
  [markStored](stored: State): void {
    this.links.clear();
    this.replaceState(stored);
    this.stored = snapshot(stored);
  }

  /** Marks the entity for deletion. Prefer `EntityManager.remove`, which also makes its id read as missing. */
  remove(): void {
    this.removed = true;
  }

  /**
   * Discards what this unit of work changed: `state` goes back to what is
   * stored — the same object, for whoever holds it — links are dropped and
   * `remove` is undone, so a flush writes nothing for it. A new entity has
   * nothing stored, so its `state` is kept; to drop it, `detach` it from its
   * manager. Answers the entity, so calls chain.
   *
   * @example
   * if (!order.isValid()) order.revert();
   */
  revert(): this {
    this.links.clear();
    this.removed = false;
    if (this.stored !== undefined) this.replaceState(this.stored);
    return this;
  }

  /** `state` becomes a copy of `next`, in place: the fields `next` lacks are deleted. */
  private replaceState(next: State): void {
    for (const key of Object.keys(this.state)) {
      if (!Object.hasOwn(next, key)) delete (this.state as Record<string, unknown>)[key];
    }
    Object.assign(this.state, snapshot(next));
  }
}

/** A class `EntityManager` can build an entity with: `Entity` or a subclass of it. */
export interface EntityClass<State extends IEntity, E = Entity<State>> {
  new (state: State, options?: EntityOptions): E;
}
