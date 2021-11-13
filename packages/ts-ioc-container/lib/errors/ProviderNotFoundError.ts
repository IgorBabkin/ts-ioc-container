export class ProviderNotFoundError extends Error {
    name = 'ProviderNotFoundError';

    constructor(key: string) {
        super(`ServiceLocator cannot find ${key}`);

        Object.setPrototypeOf(this, ProviderNotFoundError.prototype);
    }
}

export class ProviderDecoratorNotFound extends Error {
    name = 'ProviderDecoratorNotFound';

    constructor(className: string) {
        super(`Cannot find provider decorator for ${className}`);

        Object.setPrototypeOf(this, ProviderDecoratorNotFound.prototype);
    }
}
