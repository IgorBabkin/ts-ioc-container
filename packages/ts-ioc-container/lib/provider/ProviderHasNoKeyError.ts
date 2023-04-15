export class ProviderHasNoKeyError extends Error {
    name = 'ProviderHasNoKeyError';

    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, ProviderHasNoKeyError.prototype);
    }
}
