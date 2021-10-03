import { IProvider, ProviderKey, ScopeOptions } from './IProvider';
import { ProviderNotFoundError } from '../errors/ProviderNotFoundError';
import { IProviderRepository } from './IProviderRepository';
import { ProviderStorage } from './ProviderStorage';

export class ProviderRepository implements IProviderRepository {
    private readonly providers = new ProviderStorage();
    private scopeOptions: ScopeOptions;
    name?: string;
    level: number;

    constructor(private parent?: IProviderRepository, options: Partial<ScopeOptions> = {}) {
        this.level = options.level ?? 0;
        this.name = options.name;
    }

    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        this.providers.add(key, provider);
    }

    clone(parent: IProviderRepository = this, name?: string): IProviderRepository {
        const options: ScopeOptions = {
            name,
            level: this.scopeOptions.level + 1,
        };
        const repo = new ProviderRepository(parent, options);
        for (const [key, provider] of this.providers.entries()) {
            repo.add(key, provider.clone(options));
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
