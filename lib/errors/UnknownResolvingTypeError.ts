export class UnknownResolvingTypeError extends Error {
    name = 'UnknownResolvingTypeError';

    constructor(resolving: string) {
        super(`Unknown resolving type: ${resolving}`);
    }
}
