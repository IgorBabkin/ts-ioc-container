export class UnknownInjectionTypeError extends Error {
    name = 'UnknownInjectionTypeError';

    constructor(type: string) {
        super(`Unknown injection type: ${type}`);
    }
}
