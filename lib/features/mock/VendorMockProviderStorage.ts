import { IMockProviderStorage } from './IMockProviderStorage';
import { ProviderKey } from '../../core/providers/IProvider';
import { MockProvider } from './MockProvider';

export abstract class VendorMockProviderStorage {
    constructor(protected readonly storage: IMockProviderStorage) {}

    dispose(): void {
        this.storage.dispose();
    }

    abstract findOrCreate<T>(key: ProviderKey): MockProvider<T>;
}
