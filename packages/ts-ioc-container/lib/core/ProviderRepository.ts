import { IProvider, ProviderKey, ScopeOptions, Tag } from './IProvider';
import { ProviderNotFoundError } from '../errors/ProviderNotFoundError';
import { IProviderRepository } from './IProviderRepository';
import { ProviderStorage } from './ProviderStorage';

export class ProviderRepository implements IProviderRepository, ScopeOptions {
    private readonly providers = new ProviderStorage();

    constructor(private parent?: ProviderRepository, public level = 0, public tags: Tag[] = []) {}

    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        this.providers.add(key, provider);
    }

    clone(tags: Tag[] = [], parent: ProviderRepository = this): IProviderRepository {
        const repo = new ProviderRepository(parent, parent.level + 1, tags);
        for (const [key, provider] of parent.entries(repo)) {
            repo.add(key, provider.clone());
        }
        return repo;
    }

    entries(filters: ScopeOptions): Array<[ProviderKey, IProvider<any>]> {
        const localProviders = this.providers.entries(filters);
        const parentProviders = this.parent ? this.parent.entries(filters) : [];
        return Array.from(new Map([...parentProviders, ...localProviders]).entries());
    }

    dispose(): void {
        for (const p of this.providers.values()) {
            p.dispose();
        }
        this.providers.clear();
        this.parent = undefined;
    }

    find<T>(key: ProviderKey): IProvider<T> {
        const provider = this.providers.find<T>(key, this) ?? this.parent?.find<T>(key);
        if (provider === undefined) {
            throw new ProviderNotFoundError(key.toString());
        }
        return provider;
    }
}
