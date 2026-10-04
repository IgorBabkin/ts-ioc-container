/**
 * The errors this package throws. Each has a stable `code`, and its message
 * says what to do about it. All of them survive `instanceof` across package copies.
 */

/**
 * A record the repository does not have, or one removed earlier in the same
 * unit of work. Code `IOC_ENTITY_NOT_FOUND`. `key` is what it was read by — its
 * id, or the object key of a repository keyed by more — and `id` the id in it.
 *
 * @example
 * try {
 *   await orders.findByIdOrFail(id);
 * } catch (e) {
 *   if (e instanceof EntityNotFoundError) return notFound(e.entityName, e.id);
 *   throw e;
 * }
 */
export class EntityNotFoundError extends Error {
  name = 'EntityNotFoundError';
  readonly code = 'IOC_ENTITY_NOT_FOUND';
  readonly id: unknown;

  constructor(
    readonly entityName: string,
    readonly key: unknown,
  ) {
    super(`${entityName} ${describeKey(key)} was not found. Use findById to get undefined instead of an error.`);
    this.id = isKeyObject(key) && 'id' in key ? key.id : key;
    Object.setPrototypeOf(this, EntityNotFoundError.prototype);
  }
}

const isKeyObject = (key: unknown): key is Record<string, unknown> => typeof key === 'object' && key !== null;

/** `o-1`, or `id=t-1, tenant=acme` for an object key. */
function describeKey(key: unknown): string {
  if (!isKeyObject(key)) return String(key);
  return Object.entries(key)
    .map(([field, value]) => `${field}=${String(value)}`)
    .join(', ');
}

/**
 * An id used twice in one unit of work, or changed: `create` or `add` for a key
 * the manager tracks (or removed), `patch` to another id, a flush of an entity
 * whose `state.id` (or the rest of its key) was reassigned, or `add` on a
 * repository without `prepare`. Code `IOC_ENTITY_IDENTITY`.
 */
export class EntityIdentityError extends Error {
  name = 'EntityIdentityError';
  readonly code = 'IOC_ENTITY_IDENTITY';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, EntityIdentityError.prototype);
  }
}

/**
 * Records that reference each other in a cycle — new ones, or deleted ones — so
 * no order of writes satisfies their foreign keys. Code `IOC_ENTITY_REFERENCE`.
 */
export class EntityReferenceError extends Error {
  name = 'EntityReferenceError';
  readonly code = 'IOC_ENTITY_REFERENCE';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, EntityReferenceError.prototype);
  }
}
