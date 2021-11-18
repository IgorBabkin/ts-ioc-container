import { InjectionToken, IServiceLocator, isProviderKey, ProviderKey, RegisterOptions } from './IServiceLocator';
import { IInjector } from './IInjector';
import { IProvider, Tag } from './provider/IProvider';
import { EmptyServiceLocator } from './EmptyServiceLocator';
import { ProviderKeyIsBusy } from '../errors/ProviderKeyIsBusy';

type ServiceLocatorOptions = {
    tags: Tag[];
};

export class ServiceLocator implements IServiceLocator {
    static root(injector: IInjector, { tags = [] }: Partial<ServiceLocatorOptions> = {}): ServiceLocator {
        return new ServiceLocator(new EmptyServiceLocator(), injector, 0, tags);
    }

    private readonly providers = new Map<ProviderKey, IProvider<any>>();

    constructor(
        private readonly parent: IServiceLocator,
        private readonly injector: IInjector,
        readonly level: number,
        readonly tags: Tag[],
    ) {}

    register(key: ProviderKey, provider: IProvider<unknown>, options: Partial<RegisterOptions> = {}): void {
        if (options.noOverride && this.providers.has(key)) {
            throw new ProviderKeyIsBusy(key);
        }
        this.providers.set(key, provider);
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        if (isProviderKey(key)) {
            return this.providers.has(key)
                ? (this.providers.get(key) as IProvider<T>).resolve(this, ...args)
                : this.parent.resolve(key, ...args);
        }

        return this.injector.resolve<T>(this, key, ...args);
    }

    createScope(tags: Tag[] = [], parent: IServiceLocator = this): ServiceLocator {
        const scope = new ServiceLocator(parent, this.injector, this.level + 1, tags);
        for (const [key, provider] of parent.entries()) {
            if (provider.isValid(scope)) {
                scope.register(key, provider.clone());
            }
        }
        return scope;
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
    }
}
