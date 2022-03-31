import { ProviderKey } from './IServiceLocator';
import { IProvider } from './provider/IProvider';

export class ProviderRepo {
    private readonly providers = new Map<ProviderKey, IProvider<any>>();

    set(key: ProviderKey, provider: IProvider<unknown>): void {
        this.providers.set(key, provider);
    }

    get<T>(key: ProviderKey): IProvider<T> | undefined {
        return this.providers.get(key);
    }

    entries(): Array<[ProviderKey, IProvider<any>]> {
        return Array.from(this.providers.entries());
    }

    dispose(): void {
        for (const p of this.providers.values()) {
            p.dispose();
        }
        this.providers.clear();
    }
}
