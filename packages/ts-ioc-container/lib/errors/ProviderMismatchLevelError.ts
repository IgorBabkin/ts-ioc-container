import { ProviderMismatchNameError } from './ProviderMismatchNameError';
import { IRangeType } from '../helpers/IRangeType';

export class ProviderMismatchLevelError extends Error {
    name = 'ProviderMismatchLevelError';

    constructor(range: IRangeType, actualLocatorLevel: number) {
        super(`Provider intended to use in ${range.toString()} level but invoked in ${actualLocatorLevel}`);

        Object.setPrototypeOf(this, ProviderMismatchNameError.prototype);
    }
}
