import { IProvider, ProviderKey, ScopeOptions } from './IProvider';
import { ProviderNotFoundError } from '../errors/ProviderNotFoundError';
import { IProviderRepository } from './IProviderRepository';
import { ProviderStorage } from './ProviderStorage';

export class ProviderRepository implements IProviderRepository {
    private readonly providers = new ProviderStorage();

    constructor(private parent?: ProviderRepository, public level = 0, private name?: string) {}

    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        this.providers.add(key, provider);
    }

    clone(name?: string, parent: ProviderRepository = this): IProviderRepository {
        const options: ScopeOptions = { level: parent.level + 1, name };
        const repo = new ProviderRepository(parent, options.level, options.name);
        for (const [key, provider] of parent.entries()) {
            const newProvider = provider.clone();
            if (newProvider.isValid(options)) {
                repo.add(key, newProvider);
            }
        }
        return repo;
    }

    entries(): IterableIterator<[ProviderKey, IProvider<any>]> {
        return new Map([...this.parent?.entries(), ...Array.from(this.providers.entries())]).entries();
    }

    dispose(): void {
        for (const p of this.providers.values()) {
            p.dispose();
        }
        this.providers.clear();
        this.parent = undefined;
    }

    find<T>(key: ProviderKey): IProvider<T> {
        const options = { level: this.level, name: this.name };
        const provider = this.providers.find<T>(key, options) ?? this.parent?.find<T>(key);
        if (provider === undefined) {
            throw new ProviderNotFoundError(key.toString());
        }
        return provider;
    }
}
