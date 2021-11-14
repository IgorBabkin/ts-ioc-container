export class NoRegistrationKeysProvided extends Error {
    name = 'NoRegistrationKeysProvided';

    constructor() {
        super(`Pls provide registration keys for current provider`);

        Object.setPrototypeOf(this, NoRegistrationKeysProvided.prototype);
    }
}
