import { InjectionToken, IServiceLocator, isProviderKey, RegisterOptions } from './IServiceLocator';
import { IInjector } from './IInjector';
import { IProvider, Tag } from './IProvider';
import { IProviderRepository } from './IProviderRepository';
import { ProviderRepository } from './ProviderRepository';
import { NoRegistrationKeysProvided } from '../errors/NoRegistrationKeysProvided';
import { ProviderKeyIsBusy } from '../errors/ProviderKeyIsBusy';

export class ServiceLocator implements IServiceLocator {
    static root(injector: IInjector, tags?: Tag[]): ServiceLocator {
        return new ServiceLocator(injector, ProviderRepository.root(tags));
    }

    constructor(private readonly injector: IInjector, private readonly providerRepo: IProviderRepository) {}

    register(provider: IProvider<unknown>, options: Partial<RegisterOptions> = {}): this {
        const keys = provider.getKeys();
        if (keys.length === 0) {
            throw new NoRegistrationKeysProvided();
        }
        for (const key of keys) {
            if (!options.override && this.providerRepo.has(key)) {
                throw new ProviderKeyIsBusy(key);
            }
            this.providerRepo.add(key, provider);
        }
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        if (isProviderKey(key)) {
            const provider = this.providerRepo.find<T>(key);
            return provider.resolve(this, ...args);
        }

        return this.injector.resolve<T>(this, key, ...args);
    }

    createScope(tags?: Tag[]): IServiceLocator {
        return new ServiceLocator(this.injector.clone(), this.providerRepo.clone(tags));
    }

    dispose(): void {
        this.providerRepo.dispose();
        this.injector.dispose();
    }
}
