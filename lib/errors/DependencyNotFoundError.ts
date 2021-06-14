export class DependencyNotFoundError extends Error {
    name = 'DependencyNotFoundError';

    constructor(key: string) {
        super(`ServiceLocator cannot find ${key}`);
    }
}
