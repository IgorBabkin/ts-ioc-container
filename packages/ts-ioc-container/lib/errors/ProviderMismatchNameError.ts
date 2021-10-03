export class ProviderMismatchNameError extends Error {
    name = 'ProviderMismatchNameError';

    constructor(expectedLocatorName: string, actualLocatorName: string) {
        super(`Provider intended to use in ${expectedLocatorName} but invoked in ${actualLocatorName}`);

        Object.setPrototypeOf(this, ProviderMismatchNameError.prototype);
    }
}
