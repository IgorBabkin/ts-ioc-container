import { InjectionToken, IServiceLocator, Resolveable } from './IServiceLocator';
import { IInjector } from './IInjector';
import { IKeyedProvider, Tag } from './provider/IProvider';
import { IProviderRepository, isProviderKey, ProviderKey, RegisterOptions } from './IProviderRepository';
import { ProviderRepository } from './ProviderRepository';
import { NoRegistrationKeysProvided } from '../errors/NoRegistrationKeysProvided';
import { constructor } from '../helpers/types';
import { IInstanceHook } from '../features/instanceHook/IInstanceHook';
import { emptyHook } from '../features/instanceHook/emptyHook';
import { HookedProvider } from '../features/instanceHook/HookedProvider';

type ServiceLocatorOptions = {
    tags: Tag[];
    hook: IInstanceHook;
};

export class ServiceLocator implements IServiceLocator, Resolveable {
    static root(injector: IInjector, { tags, hook }: Partial<ServiceLocatorOptions> = {}): ServiceLocator {
        return new ServiceLocator(injector, ProviderRepository.root(tags), hook);
    }

    private readonly instances = new Set();

    constructor(
        private readonly injector: IInjector,
        private readonly providerRepo: IProviderRepository,
        private hook: IInstanceHook = emptyHook,
    ) {}

    register(provider: IKeyedProvider<unknown>, options?: Partial<RegisterOptions>): this {
        const keys = provider.getKeys();
        if (keys.length === 0) {
            throw new NoRegistrationKeysProvided();
        }
        for (const key of keys) {
            this.providerRepo.add(key, new HookedProvider(provider, this.hook), options);
        }
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        if (isProviderKey(key)) {
            const provider = this.providerRepo.find<T>(key);
            return provider.resolve(this, ...args);
        }

        const instance = this.injector.resolve<T>(this, key, ...args);
        this.hook.onConstruct(instance);
        this.instances.add(instance);
        return instance;
    }

    /**
     * @description Use only inside of provider
     */
    resolveClass<T>(key: constructor<T>, ...args: any[]): T {
        return this.injector.resolve<T>(this, key, ...args);
    }

    /**
     * @description Use only inside of provider
     */
    resolveByKey<T>(key: ProviderKey, ...args: any[]): T {
        const provider = this.providerRepo.find<T>(key);
        return provider.resolve(this, ...args);
    }

    createScope(tags?: Tag[]): IServiceLocator {
        return new ServiceLocator(this.injector, this.providerRepo.clone(tags));
    }

    dispose(): void {
        for (const i of this.instances) {
            this.hook.onDispose(i);
        }
        this.instances.clear();
        this.providerRepo.dispose();
    }
}
