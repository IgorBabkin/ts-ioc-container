import { IMockProviderStorage } from './IMockProviderStorage';
import { ProviderKey } from '../../core/IProvider';
import { MockProvider } from './MockProvider';

export abstract class VendorMockProviderStorage implements IMockProviderStorage {
    constructor(protected readonly storage: IMockProviderStorage) {}

    dispose(): void {
        this.storage.dispose();
    }

    abstract findOrCreate<T>(key: ProviderKey): MockProvider<T>;
}
