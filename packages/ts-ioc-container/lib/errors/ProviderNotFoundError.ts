export class ProviderNotFoundError extends Error {
    name = 'ProviderNotFoundError';

    constructor(key: string) {
        super(`ServiceLocator cannot find ${key}`);

        Object.setPrototypeOf(this, ProviderNotFoundError.prototype);
    }
}
