import { IProvider, ProviderKey, ScopeOptions, Tag } from './IProvider';
import { ProviderNotFoundError } from '../errors/ProviderNotFoundError';
import { IProviderRepository } from './IProviderRepository';
import { ProviderStorage } from './ProviderStorage';

export class ProviderRepository implements IProviderRepository {
    private readonly providers = new ProviderStorage();

    constructor(private parent?: ProviderRepository, public level = 0, private tags: Tag[] = []) {}

    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        this.providers.add(key, provider);
    }

    clone(tags: Tag[] = [], parent: ProviderRepository = this): IProviderRepository {
        const options = { level: parent.level + 1, tags };
        const repo = new ProviderRepository(parent, options.level, options.tags);
        for (const [key, provider] of parent.entries(options)) {
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
        const options = { level: this.level, tags: this.tags };
        const provider = this.providers.find<T>(key, options) ?? this.parent?.find<T>(key);
        if (provider === undefined) {
            throw new ProviderNotFoundError(key.toString());
        }
        return provider;
    }
}
