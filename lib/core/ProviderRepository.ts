import { IProvider, ProviderKey } from './IProvider';
import { ProviderNotFoundError } from '../errors/ProviderNotFoundError';
import { IProviderRepository } from './IProviderRepository';

export class ProviderRepository implements IProviderRepository {
    private providers = new Map<ProviderKey, IProvider<any>>();

    constructor(private parent?: IProviderRepository) {}

    add<T>(key: ProviderKey, provider: IProvider<T>): this {
        this.providers.set(key, provider);
        return this;
    }

    clone(parent: IProviderRepository = this): IProviderRepository {
        const repo = new ProviderRepository(parent);
        for (const [key, provider] of this.providers.entries()) {
            switch (provider.resolving) {
                case 'perScope':
                    repo.add(key, provider.clone({ resolving: 'singleton' }));
                    break;
                case 'perRequest':
                    repo.add(key, provider.clone());
            }
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
        const provider = (this.providers.get(key) as IProvider<T>) ?? this.parent?.find<T>(key);
        if (provider === undefined) {
            throw new ProviderNotFoundError(key.toString());
        }
        return provider;
    }
}
