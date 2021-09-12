import { IProviderRepository } from '../core/IProviderRepository';
import { IProvider, ProviderKey } from '../core/providers/IProvider';

interface IProviderRepositoryHook {
    onBeforeAdd<T>(provider: IProvider<T>): IProvider<T>;
}

export class HookedProviderRepository implements IProviderRepository {
    constructor(private readonly decorated: IProviderRepository, private readonly hook: IProviderRepositoryHook) {}

    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        this.decorated.add(key, this.hook.onBeforeAdd(provider));
    }

    clone(parent: IProviderRepository = this): IProviderRepository {
        return new HookedProviderRepository(this.decorated.clone(parent), this.hook);
    }

    dispose(): void {
        this.decorated.dispose();
    }

    find<T>(key: ProviderKey): IProvider<T> {
        return this.decorated.find(key);
    }
}
