import { InjectionToken, IServiceLocator, isProviderKey } from './IServiceLocator';
import { IInjector } from './IInjector';
import { IProvider, ProviderKey, Tag } from './IProvider';
import { IProviderRepository } from './IProviderRepository';
import { ProviderRepository } from './ProviderRepository';

export class ServiceLocator implements IServiceLocator {
    constructor(
        private readonly injector: IInjector,
        private readonly providerRepo: IProviderRepository = new ProviderRepository(),
    ) {}

    register<T>(key: ProviderKey, provider: IProvider<T>): this {
        this.providerRepo.add(key, provider);
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        if (isProviderKey(key)) {
            const provider = this.providerRepo.find<T>(key);
            return provider.resolve(this, ...args);
        }

        return this.injector.resolve<T>(this, key, ...args);
    }

    createLocator(tags?: Tag[]): IServiceLocator {
        return new ServiceLocator(this.injector.clone(), this.providerRepo.clone(tags));
    }

    dispose(): void {
        this.providerRepo.dispose();
        this.injector.dispose();
    }
}
