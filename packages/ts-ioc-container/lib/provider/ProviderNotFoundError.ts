export class ProviderNotFoundError extends Error {
    name = 'ProviderNotFoundError';

    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, ProviderNotFoundError.prototype);
    }
}
