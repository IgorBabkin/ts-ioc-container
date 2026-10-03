import { EntityReferenceError } from './errors';
import { isPlainObject } from './snapshot';

/**
 * A record that does not exist yet, standing where its id is wanted — in a
 * foreign-key field of another entity's state. Nothing is written when it is
 * made: when the entity holding it is flushed, the record is created, and the
 * reference in that state is replaced with the created record's id. One that
 * no flushed state holds is never created; one held by several is created once.
 *
 * ```ts
 * post.state.commentId = comments.lazy({ text: 'First!' });
 * ```
 */
export class LazyRef<E extends { readonly id: unknown } = { readonly id: unknown }> {
  private resolved?: Promise<E>;
  private resolving = false;

  constructor(private readonly load: () => Promise<E>) {}

  /** The record, created on the first call; every later call answers the same one. */
  resolve(): Promise<E> {
    if (this.resolving)
      throw new EntityReferenceError(
        'A lazy reference was asked for while it was being created: the references form a cycle',
      );
    if (this.resolved === undefined) {
      this.resolving = true;
      this.resolved = this.load().finally(() => {
        this.resolving = false;
      });
    }
    return this.resolved;
  }
}

/** A foreign-key field: the id of a record, or a `LazyRef` to one that does not exist yet. */
export type Ref<Id> = Id | LazyRef<{ readonly id: Id }>;

type ResolvedValue<V> = V extends LazyRef<infer E> ? E['id'] : V extends (infer Item)[] ? ResolvedValue<Item>[] : V;

/** A state as a repository receives it: every `Ref` field holds an id. */
export type Resolved<State> = { [K in keyof State]: ResolvedValue<State[K]> };

/**
 * Replaces, in place, every `LazyRef` in `value` — in its fields, and in the
 * arrays and plain objects they hold — with the id of the record it creates,
 * one after another. Answers `value`, a `LazyRef` itself answering its id.
 */
export async function resolveRefs<T>(value: T): Promise<Resolved<T>> {
  if (value instanceof LazyRef) return (await value.resolve()).id as Resolved<T>;
  if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) value[i] = await resolveRefs(item);
  } else if (isPlainObject(value)) {
    const fields: Record<string, unknown> = value;
    for (const [key, item] of Object.entries(fields)) fields[key] = await resolveRefs(item);
  }
  return value as Resolved<T>;
}
