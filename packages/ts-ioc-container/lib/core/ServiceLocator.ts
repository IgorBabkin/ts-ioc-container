import { InjectionToken, IServiceLocator } from './IServiceLocator';
import { IInjector } from './IInjector';
import { IKeyedProvider, Tag } from './provider/IProvider';
import { IProviderRepository, isProviderKey, RegisterOptions } from './IProviderRepository';
import { ProviderRepository } from './ProviderRepository';
import { NoRegistrationKeysProvided } from '../errors/NoRegistrationKeysProvided';

export class ServiceLocator implements IServiceLocator {
    static root(injector: IInjector, tags?: Tag[]): ServiceLocator {
        return new ServiceLocator(injector, ProviderRepository.root(tags));
    }

    constructor(private readonly injector: IInjector, private readonly providerRepo: IProviderRepository) {}

    register(provider: IKeyedProvider<unknown>, options?: Partial<RegisterOptions>): this {
        const keys = provider.getKeys();
        if (keys.length === 0) {
            throw new NoRegistrationKeysProvided();
        }
        for (const key of keys) {
            this.providerRepo.add(key, provider, options);
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
