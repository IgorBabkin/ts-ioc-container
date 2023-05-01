import { IProvider, ProviderKey } from './IProvider';

export class ProviderRepo {
    private readonly providers = new Map<ProviderKey, IProvider>();

    add(key: ProviderKey, provider: IProvider): this {
        this.providers.set(key, provider);
        return this;
    }

    find<T>(key: ProviderKey): IProvider<T> | undefined {
        return this.providers.get(key) as IProvider<T>;
    }

    merge(providers: Map<ProviderKey, IProvider>): Map<ProviderKey, IProvider> {
        const map = new Map<ProviderKey, IProvider>();
        for (const [key, value] of providers.entries()) {
            map.set(key, value);
        }
        for (const [key, value] of this.providers.entries()) {
            map.set(key, value);
        }
        return map;
    }

    dispose(): void {
        for (const p of this.providers.values()) {
            p.dispose();
        }
        this.providers.clear();
    }
}
