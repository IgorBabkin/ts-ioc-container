export class ConflictError extends Error {
    static assert(isTrue: boolean, failMessage: string) {
        if (!isTrue) {
            throw new ConflictError(failMessage);
        }
    }

    name = 'ConflictError';

    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}
