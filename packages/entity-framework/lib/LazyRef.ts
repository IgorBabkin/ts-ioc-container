import { Flush } from './Flush';
import { snapshot } from './snapshot';

/** What `link` needs of a `LazyRef`: the record it creates, once. */
export interface ILazyRef<E extends { readonly id: unknown }> {
  resolve(): Promise<E>;
}

/**
 * What `link` accepts for a field: a `LazyRef` to a record whose id the field
 * holds, or — for an array field — ids and `LazyRef`s mixed.
 */
export type Linkable<V> = [V] extends [readonly (infer Item)[]]
  ? (Item | ILazyRef<{ readonly id: Item }>)[]
  : ILazyRef<{ readonly id: NonNullable<V> }>;

/** How a `LazyRef` creates its record in a flush; not exported from the package. */
export const createIn = Symbol('createIn');

/** Fields waiting for the ids of records that do not exist yet. Internal to `Entity` and `LazyRef`. */
export class Links<T> {
  private readonly links = new Map<keyof T, unknown>();

  get size(): number {
    return this.links.size;
  }

  set<K extends keyof T>(field: K, ref: Linkable<T[K]>): void {
    this.links.set(field, ref);
  }

  /**
   * A copy of `target` with each linked field set to the id its record got in
   * `flush` — created there, one after another. `target` and the links are left
   * as they are, so a flush that fails can be retried.
   */
  async resolve(target: T, flush: Flush): Promise<T> {
    const resolved = snapshot(target);
    for (const [field, ref] of this.links) {
      resolved[field] = (await resolveLink(ref, flush)) as T[keyof T];
    }
    return resolved;
  }

  clear(): void {
    this.links.clear();
  }
}

/** A created record, as a `LazyRef` needs it: its id now, its entity once the flush commits. */
export interface Created<E> {
  readonly id: unknown;
  /** Tracks the record; called when the flush that created it commits. */
  adopt(): E;
}

/**
 * A record that does not exist yet, to `link` into a field that holds its id.
 * Nothing is written when it is made: when the entity it is linked into is
 * flushed, the record is created and the field gets its id. One no flushed
 * entity links is never created; one linked several times is created once.
 * When the flush that created it fails, it is created again by the next one.
 *
 * ```ts
 * post.link('commentId', comments.lazy({ text: 'First!' }));
 * ```
 */
export class LazyRef<
  E extends { readonly id: unknown } = { readonly id: unknown },
  Value = unknown,
> implements ILazyRef<E> {
  private readonly links = new Links<Value>();
  private readonly value: Value;
  private created?: E;

  /** `value` is copied now; `create` gets a copy, with every field linked into it set. */
  constructor(
    value: Value,
    private readonly create: (value: Value) => Promise<Created<E>>,
  ) {
    this.value = snapshot(value);
  }

  /** Sets `field` of the value, when it is created, to the id of another record that does not exist yet. */
  link<K extends keyof Value>(field: K, ref: Linkable<Value[K]>): this {
    this.links.set(field, ref);
    return this;
  }

  /**
   * The record, created on the first call; every later call answers the same one.
   * A flush calls it for you — call it yourself only to create the record now.
   *
   * @throws {EntityReferenceError} when lazy records linked into each other form a cycle.
   */
  async resolve(): Promise<E> {
    if (this.created === undefined) {
      const flush = new Flush();
      await this[createIn](flush);
      flush.commit();
    }
    return this.created!;
  }

  /**
   * Creates the record in `flush`, once, and answers its id; the record is
   * kept, and tracked, only when the flush commits.
   *
   * @throws {EntityReferenceError} when lazy records linked into each other form a cycle.
   */
  async [createIn](flush: Flush): Promise<unknown> {
    if (this.created !== undefined) return this.created.id;
    return flush.once(this, async () => {
      const created = await this.create(await this.links.resolve(this.value, flush));
      flush.onCommit(() => {
        this.created = created.adopt();
      });
      return created.id;
    });
  }
}

async function resolveLink(ref: unknown, flush: Flush): Promise<unknown> {
  if (ref instanceof LazyRef) return ref[createIn](flush);
  if (!Array.isArray(ref)) return ref;
  const ids: unknown[] = [];
  for (const item of ref) ids.push(await resolveLink(item, flush));
  return ids;
}
