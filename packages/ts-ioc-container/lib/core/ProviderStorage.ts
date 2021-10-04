import { IProvider, ProviderKey, ScopeOptions } from './IProvider';

export class ProviderStorage {
    private readonly providers = new Map<ProviderKey, IProvider<any>>();

    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        this.providers.set(key, provider);
    }

    entries(): IterableIterator<[ProviderKey, IProvider<any>]> {
        return this.providers.entries();
    }

    values(): IterableIterator<IProvider<any>> {
        return this.providers.values();
    }

    find<T>(key: ProviderKey, filters: ScopeOptions): IProvider<T> | undefined {
        const provider = this.providers.get(key) as IProvider<T>;
        if (!provider || !provider.isValid(filters)) {
            return undefined;
        }
        return provider;
    }

    clear(): void {
        this.providers.clear();
    }
}
