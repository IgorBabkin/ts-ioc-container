export class ProviderCannotBeClonedError extends Error {
    name = 'ProviderCannotBeClonedError';

    constructor() {
        super(`Provider cannot be cloned`);
    }
}
