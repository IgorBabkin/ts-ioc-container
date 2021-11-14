import { IKeyedProvider, ProviderKey, Tag } from './IProvider';
import { IProviderRepository } from './IProviderRepository';
import { EmptyProviderRepository } from './EmptyProviderRepository';
import { RegisterOptions } from './IServiceLocator';
import { ProviderKeyIsBusy } from '../errors/ProviderKeyIsBusy';

export class ProviderRepository implements IProviderRepository {
    static root(tags: Tag[] = []): ProviderRepository {
        return new ProviderRepository(new EmptyProviderRepository(), 0, tags);
    }

    private readonly providers = new Map<ProviderKey, IKeyedProvider<any>>();

    constructor(private parent: IProviderRepository, readonly level: number, readonly tags: Tag[]) {}

    add<T>(key: ProviderKey, provider: IKeyedProvider<T>, options: Partial<RegisterOptions> = {}): void {
        if (options.noOverride && this.providers.has(key)) {
            throw new ProviderKeyIsBusy(key);
        }
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

    entries(): Array<[ProviderKey, IKeyedProvider<any>]> {
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

    find<T>(key: ProviderKey): IKeyedProvider<T> {
        const provider = this.providers.get(key) as IKeyedProvider<T>;
        return provider && provider.isValid(this) ? provider : this.parent.find<T>(key);
    }
}
