import { InjectionToken, IServiceLocator, isProviderKey } from './IServiceLocator';
import { IInjector } from './IInjector';
import { IProvider, ProviderKey, Tag } from './IProvider';
import { IProviderRepository } from './IProviderRepository';
import { ProviderRepository } from './ProviderRepository';

export class ServiceLocator implements IServiceLocator {
    static root(injector: IInjector, tags?: Tag[]): ServiceLocator {
        return new ServiceLocator(injector, ProviderRepository.root(tags));
    }

    constructor(private readonly injector: IInjector, private readonly providerRepo: IProviderRepository) {}

    register(dictionary: Record<ProviderKey, IProvider<unknown>>): this {
        for (const [key, provider] of Object.entries(dictionary)) {
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
