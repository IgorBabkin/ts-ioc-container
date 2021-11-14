import { IMockProviderStorage } from './IMockProviderStorage';
import { MockProvider } from './MockProvider';
import { ProviderKey } from '../../core/IProviderRepository';

export abstract class VendorMockProviderStorage implements IMockProviderStorage {
    constructor(protected readonly storage: IMockProviderStorage) {}

    dispose(): void {
        this.storage.dispose();
    }

    abstract findOrCreate<T>(key: ProviderKey): MockProvider<T>;
}
