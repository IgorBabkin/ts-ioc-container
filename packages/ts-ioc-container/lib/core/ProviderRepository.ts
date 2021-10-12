import { IProvider, ProviderKey, ScopeOptions, Tag } from './IProvider';
import { ProviderNotFoundError } from '../errors/ProviderNotFoundError';
import { IProviderRepository } from './IProviderRepository';

export class ProviderRepository implements IProviderRepository, ScopeOptions {
    private readonly providers = new Map<ProviderKey, IProvider<any>>();

    constructor(private parent?: ProviderRepository, public level = 0, public tags: Tag[] = []) {}

    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        this.providers.set(key, provider);
    }

    clone(tags: Tag[] = [], parent: ProviderRepository = this): IProviderRepository {
        const repo = new ProviderRepository(parent, parent.level + 1, tags);
        for (const [key, provider] of parent.entries(repo)) {
            repo.add(key, provider.clone());
        }
        return repo;
    }

    entries(filters: ScopeOptions): Array<[ProviderKey, IProvider<any>]> {
        const localProviders = Array.from(this.providers.entries()).filter(([, value]) => value.isValid(filters));
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
        const provider = this.findLocally<T>(key) ?? this.parent?.find<T>(key);
        if (provider === undefined) {
            throw new ProviderNotFoundError(key.toString());
        }
        return provider;
    }

    private findLocally<T>(key: ProviderKey): IProvider<T> | undefined {
        const provider = this.providers.get(key) as IProvider<T>;
        if (!provider || !provider.isValid({ level: this.level, tags: this.tags })) {
            return undefined;
        }
        return provider;
    }
}
