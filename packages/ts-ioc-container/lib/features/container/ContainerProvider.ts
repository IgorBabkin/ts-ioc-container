import { IServiceLocator, ProviderKey } from '../../core/IServiceLocator';
import { IProvider } from '../../core/provider/IProvider';
import { IContainerProvider } from './IContainerProvider';
import { NoRegistrationKeysProvided } from '../../errors/NoRegistrationKeysProvided';

export class ContainerProvider<T> implements IContainerProvider<T> {
    constructor(private provider: IProvider<T>, private keys = new Set<ProviderKey>()) {}

    appendTo(locator: IServiceLocator): void {
        if (this.keys.size === 0) {
            throw new NoRegistrationKeysProvided();
        }
        for (const key of this.keys) {
            locator.register(key, this.provider);
        }
    }
}
