export class EntityNotFoundError extends Error {
    name = 'EntityNotFoundError';

    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, EntityNotFoundError.prototype);
    }
}
