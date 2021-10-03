export class ProviderMismatchNameError extends Error {
    name = 'ProviderMismatchNameError';

    constructor(expectedLocatorName: string, actualLocatorName: string) {
        super(`Provider intended to use for ${expectedLocatorName} name but invoked in ${actualLocatorName}`);

        Object.setPrototypeOf(this, ProviderMismatchNameError.prototype);
    }
}
