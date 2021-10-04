import { IProvider, ProviderKey } from './IProvider';
import { ProviderAdapter } from './ProviderAdapter';

export class ProviderStorage {
    private readonly providers = new Map<ProviderKey, ProviderAdapter<any>>();

    add<T>(key: ProviderKey, provider: ProviderAdapter<T>): void {
        this.providers.set(key, provider);
    }

    entries(): IterableIterator<[ProviderKey, ProviderAdapter<any>]> {
        return this.providers.entries();
    }

    values(): IterableIterator<IProvider<any>> {
        return this.providers.values();
    }

    find<T>(key: ProviderKey): ProviderAdapter<T> | undefined {
        const provider = this.providers.get(key) as ProviderAdapter<T>;
        if (!provider.isValid()) {
            return undefined;
        }
        return provider;
    }

    clear(): void {
        this.providers.clear();
    }
}
