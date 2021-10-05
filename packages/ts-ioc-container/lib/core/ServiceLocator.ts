import { CreateInjectorFn, InjectionToken, IServiceLocator, isProviderKey } from './IServiceLocator';
import { IInjector } from './IInjector';
import { IProvider, ProviderKey, Tag } from './IProvider';
import { IProviderRepository } from './IProviderRepository';

export class ServiceLocator implements IServiceLocator {
    private readonly injector: IInjector;

    constructor(private readonly createInjector: CreateInjectorFn, private readonly providerRepo: IProviderRepository) {
        this.injector = createInjector(this);
    }

    register<T>(key: ProviderKey, provider: IProvider<T>): this {
        this.providerRepo.add(key, provider);
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        if (isProviderKey(key)) {
            const provider = this.providerRepo.find<T>(key);
            return provider.resolve(this, ...args);
        }

        return this.injector.resolve<T>(key, ...args);
    }

    createLocator(tags: Tag[] = []): IServiceLocator {
        return new ServiceLocator(this.createInjector, this.providerRepo.clone(tags));
    }

    dispose(): void {
        this.providerRepo.dispose();
        this.injector.dispose();
    }
}
