export class NoRegistrationKeysProvidedError extends Error {
    name = 'NoRegistrationKeysProvided';

    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, NoRegistrationKeysProvidedError.prototype);
    }
}
