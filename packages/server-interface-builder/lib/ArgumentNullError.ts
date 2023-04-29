export class ArgumentNullError extends Error {
    static assert(isTrue: boolean, failMessage: string) {
        if (!isTrue) {
            throw new ArgumentNullError(failMessage);
        }
    }

    name = 'ArgumentNullError';

    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, ArgumentNullError.prototype);
    }
}
