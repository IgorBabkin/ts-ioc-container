import { IProvider, ProviderKey } from './IProvider';

export class ProviderRepo {
    private readonly providers = new Map<ProviderKey, IProvider<unknown>>();

    add(key: ProviderKey, provider: IProvider<unknown>): this {
        this.providers.set(key, provider);
        return this;
    }

    get<T>(key: ProviderKey): IProvider<T> | undefined {
        return this.providers.get(key) as IProvider<T>;
    }

    merge(providers: Map<ProviderKey, IProvider<unknown>>): Map<ProviderKey, IProvider<unknown>> {
        const map = new Map<ProviderKey, IProvider<unknown>>();
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
