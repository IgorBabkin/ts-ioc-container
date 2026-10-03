import { EntityReferenceError } from './errors';
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

/** Fields waiting for the ids of records that do not exist yet. Internal to `Entity` and `LazyRef`. */
export class Links<T> {
  private readonly links = new Map<keyof T, unknown>();

  get size(): number {
    return this.links.size;
  }

  set<K extends keyof T>(field: K, ref: Linkable<T[K]>): void {
    this.links.set(field, ref);
  }

  /** Creates each linked record, one after another, and sets its id on `target`. */
  async resolveInto(target: T): Promise<void> {
    for (const [field, ref] of this.links) {
      target[field] = (await resolveLink(ref)) as T[keyof T];
    }
    this.links.clear();
  }
}

/**
 * A record that does not exist yet, to `link` into a field that holds its id.
 * Nothing is written when it is made: when the entity it is linked into is
 * flushed, the record is created and the field gets its id. One no flushed
 * entity links is never created; one linked several times is created once.
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
  private readonly load: () => Promise<E>;
  private resolved?: Promise<E>;
  private resolving = false;

  /** `value` is copied now; `create` gets the copy, with every field linked into it set. */
  constructor(value: Value, create: (value: Value) => Promise<E>) {
    const copy = snapshot(value);
    this.load = async () => {
      await this.links.resolveInto(copy);
      return create(copy);
    };
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
  resolve(): Promise<E> {
    if (this.resolving) {
      throw new EntityReferenceError(
        'Lazy records are linked into each other in a cycle, so none can be created first. ' +
          'Break the cycle: link one side, flush, then set the other field to the id it got.',
      );
    }
    if (this.resolved === undefined) {
      this.resolving = true;
      this.resolved = this.load().finally(() => {
        this.resolving = false;
      });
    }
    return this.resolved;
  }
}

async function resolveLink(ref: unknown): Promise<unknown> {
  if (ref instanceof LazyRef) return ((await ref.resolve()) as { readonly id: unknown }).id;
  if (!Array.isArray(ref)) return ref;
  const ids: unknown[] = [];
  for (const item of ref) ids.push(await resolveLink(item));
  return ids;
}
