/**
 * The errors this package throws. Each has a stable `code`, and its message
 * says what to do about it. All of them survive `instanceof` across package copies.
 */

/**
 * A record the repository does not have, or one removed earlier in the same
 * unit of work. Code `IOC_ENTITY_NOT_FOUND`.
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

  constructor(
    readonly entityName: string,
    readonly id: unknown,
  ) {
    super(`${entityName} ${String(id)} was not found. Use findById to get undefined instead of an error.`);
    Object.setPrototypeOf(this, EntityNotFoundError.prototype);
  }
}

/**
 * An id used twice in one unit of work, or changed: `create` for an id the
 * manager tracks (or removed), `patch` to another id, or a flush of an entity
 * whose `state.id` was reassigned. Code `IOC_ENTITY_IDENTITY`.
 */
export class EntityIdentityError extends Error {
  name = 'EntityIdentityError';
  readonly code = 'IOC_ENTITY_IDENTITY';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, EntityIdentityError.prototype);
  }
}

/** Lazy records linked into each other in a cycle, so none can be created first. Code `IOC_ENTITY_REFERENCE`. */
export class EntityReferenceError extends Error {
  name = 'EntityReferenceError';
  readonly code = 'IOC_ENTITY_REFERENCE';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, EntityReferenceError.prototype);
  }
}

/**
 * An `EntityManager` resolved without a repository token among its arguments:
 * `IEntityManagerToken.resolve(scope)` on its own, or with a token not made by
 * `repositoryToken`. Code `IOC_ENTITY_MANAGER_ARGUMENT`.
 */
export class EntityManagerArgumentError extends Error {
  name = 'EntityManagerArgumentError';
  readonly code = 'IOC_ENTITY_MANAGER_ARGUMENT';

  constructor() {
    super(
      'An EntityManager was resolved without a repository token. Resolve it with entityManagerToken(IMyRepositoryToken).resolve(scope), ' +
        "where IMyRepositoryToken = repositoryToken<MyRepository>('IMyRepository') — a plain SingleToken is not recognised.",
    );
    Object.setPrototypeOf(this, EntityManagerArgumentError.prototype);
  }
}
