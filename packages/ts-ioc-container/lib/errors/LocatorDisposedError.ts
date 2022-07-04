export class LocatorDisposedError extends Error {
    name = 'LocatorDisposedError';

    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, LocatorDisposedError.prototype);
    }
}
