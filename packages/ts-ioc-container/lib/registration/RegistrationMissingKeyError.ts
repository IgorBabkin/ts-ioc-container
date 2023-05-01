export class RegistrationMissingKeyError extends Error {
    name = 'RegistrationMissingKeyError';

    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, RegistrationMissingKeyError.prototype);
    }
}
