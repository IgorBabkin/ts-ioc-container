import { IProvider, ProviderKey, Tag } from './IProvider';
import { IProviderRepository } from './IProviderRepository';
import { EmptyProviderRepository } from './EmptyProviderRepository';

export class ProviderRepository implements IProviderRepository {
    static root(tags: Tag[] = []): ProviderRepository {
        return new ProviderRepository(new EmptyProviderRepository(), 0, tags);
    }

    private readonly providers = new Map<ProviderKey, IProvider<any>>();

    constructor(private parent: IProviderRepository, readonly level: number, readonly tags: Tag[]) {}

    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        this.providers.set(key, provider);
    }

    clone(tags: Tag[] = [], parent: IProviderRepository = this): IProviderRepository {
        const repo = new ProviderRepository(parent, parent.level + 1, tags);
        for (const [key, provider] of parent.entries()) {
            if (provider.isValid(repo)) {
                repo.add(key, provider.clone());
            }
        }
        return repo;
    }

    entries(): Array<[ProviderKey, IProvider<any>]> {
        const localProviders = Array.from(this.providers.entries());
        return Array.from(new Map([...this.parent.entries(), ...localProviders]).entries());
    }

    dispose(): void {
        for (const p of this.providers.values()) {
            p.dispose();
        }
        this.providers.clear();
        this.parent = new EmptyProviderRepository();
    }

    find<T>(key: ProviderKey): IProvider<T> {
        const provider = this.providers.get(key) as IProvider<T>;
        return provider && provider.isValid(this) ? provider : this.parent.find<T>(key);
    }
}
