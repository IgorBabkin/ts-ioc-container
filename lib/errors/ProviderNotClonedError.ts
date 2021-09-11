export class ProviderNotClonedError extends Error {
    name = 'ProviderNotClonedError';

    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, ProviderNotClonedError.prototype);
    }
}
