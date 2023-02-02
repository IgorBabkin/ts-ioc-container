export class ProviderNotFoundError extends Error {
    name = 'ProviderNotFoundError';

    constructor(key: string) {
        super(`Cannot find ${key}`);

        Object.setPrototypeOf(this, ProviderNotFoundError.prototype);
    }
}
