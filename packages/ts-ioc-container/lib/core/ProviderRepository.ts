import { IProvider, ProviderKey } from './IProvider';
import { ProviderNotFoundError } from '../errors/ProviderNotFoundError';
import { IProviderRepository } from './IProviderRepository';
import { ProviderStorage } from './ProviderStorage';
import { ProviderAdapter } from './ProviderAdapter';

export class ProviderRepository implements IProviderRepository {
    private readonly providers = new ProviderStorage();

    constructor(private parent?: IProviderRepository, private level = 0, private name?: string) {}

    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        this.providers.add(key, new ProviderAdapter(provider, { level: this.level, name: this.name }));
    }

    clone(name?: string, parent: IProviderRepository = this): IProviderRepository {
        const repo = new ProviderRepository(parent, this.level + 1);
        for (const [key, provider] of this.providers.entries()) {
            repo.add(key, provider.clone());
        }
        return repo;
    }

    dispose(): void {
        for (const p of this.providers.values()) {
            p.dispose();
        }
        this.providers.clear();
        this.parent = undefined;
    }

    find<T>(key: ProviderKey): IProvider<T> {
        const provider = this.providers.find<T>(key) ?? this.parent?.find<T>(key);
        if (provider === undefined) {
            throw new ProviderNotFoundError(key.toString());
        }
        return provider;
    }
}
