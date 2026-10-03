/** A record the repository does not have, or one removed earlier in the same unit of work. Code `IOC_ENTITY_NOT_FOUND`. */
export class EntityNotFoundError extends Error {
  name = 'EntityNotFoundError';
  readonly code = 'IOC_ENTITY_NOT_FOUND';

  constructor(
    readonly entityName: string,
    readonly id: unknown,
  ) {
    super(`${entityName} ${String(id)} was not found.`);
    Object.setPrototypeOf(this, EntityNotFoundError.prototype);
  }
}

/** A `create` for an id the entity manager already tracks, or a tracked entity whose `id` was changed. Code `IOC_ENTITY_IDENTITY`. */
export class EntityIdentityError extends Error {
  name = 'EntityIdentityError';
  readonly code = 'IOC_ENTITY_IDENTITY';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, EntityIdentityError.prototype);
  }
}

/** A `LazyRef` that cannot be resolved — its references form a cycle. Code `IOC_ENTITY_REFERENCE`. */
export class EntityReferenceError extends Error {
  name = 'EntityReferenceError';
  readonly code = 'IOC_ENTITY_REFERENCE';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, EntityReferenceError.prototype);
  }
}
