export class PropNotFoundError extends Error {
    name = 'PropNotFoundError';

    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, PropNotFoundError.prototype);
    }
}
