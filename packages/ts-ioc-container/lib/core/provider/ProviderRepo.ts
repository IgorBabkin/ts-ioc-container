import { IProvider, ProviderKey } from './IProvider';

export class ProviderRepo {
    private readonly providers = new Map<ProviderKey, IProvider<unknown>>();

    add(provider: IProvider<unknown>): void {
        this.providers.set(provider.getKeyOrFail(), provider);
    }

    get<T>(key: ProviderKey): IProvider<T> | undefined {
        return this.providers.get(key) as IProvider<T>;
    }

    merge(providers: IProvider<unknown>[]): IProvider<unknown>[] {
        const map = new Map<ProviderKey, IProvider<unknown>>();
        for (const p of providers.concat(Array.from(this.providers.values()))) {
            map.set(p.getKeyOrFail(), p);
        }
        return Array.from(map.values());
    }

    dispose(): void {
        for (const p of this.providers.values()) {
            p.dispose();
        }
        this.providers.clear();
    }
}
