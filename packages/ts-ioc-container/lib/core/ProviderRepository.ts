import { IProvider, ProviderKey, ScopeOptions } from './IProvider';
import { ProviderNotFoundError } from '../errors/ProviderNotFoundError';
import { IProviderRepository } from './IProviderRepository';
import { ProviderStorage } from './ProviderStorage';

export class ProviderRepository implements IProviderRepository {
    private readonly providers = new ProviderStorage();

    constructor(private parent?: ProviderRepository, public level = 0, private tags: string[] = []) {}

    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        this.providers.add(key, provider);
    }

    clone(tags: string[] = [], parent: ProviderRepository = this): IProviderRepository {
        const options: ScopeOptions = { level: parent.level + 1, tags };
        const repo = new ProviderRepository(parent, options.level, options.tags);
        for (const [key, provider] of parent.entries()) {
            const newProvider = provider.clone();
            if (newProvider.isValid(options)) {
                repo.add(key, newProvider);
            }
        }
        return repo;
    }

    entries(): Array<[ProviderKey, IProvider<any>]> {
        const localProviders = Array.from(this.providers.entries());
        const parentProviders = this.parent ? this.parent.entries() : [];
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
        const provider =
            this.providers.find<T>(key, { level: this.level, tags: this.tags }) ?? this.parent?.find<T>(key);
        if (provider === undefined) {
            throw new ProviderNotFoundError(key.toString());
        }
        return provider;
    }
}
