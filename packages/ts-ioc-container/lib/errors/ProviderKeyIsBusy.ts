import { ProviderKey } from '../core/IProvider';

export class ProviderKeyIsBusy extends Error {
    name = 'ProviderKeyIsBusy';

    constructor(key: ProviderKey) {
        super(`Provider key (${key.toString()}) is busy`);

        Object.setPrototypeOf(this, ProviderKeyIsBusy.prototype);
    }
}
