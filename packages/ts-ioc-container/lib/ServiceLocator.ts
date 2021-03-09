import { InjectionToken, IServiceLocator } from './IServiceLocator';
import { IServiceLocatorStrategy } from './strategy/IServiceLocatorStrategy';
import { IProvider, ProviderKey } from './provider/IProvider';
import { constructor } from './helpers/types';
import { DependencyNotFoundError } from './errors/DependencyNotFoundError';
import { IHook } from './hooks/IHook';
import { Hook } from './hooks/Hook';

export class ServiceLocator implements IServiceLocator {
    private providers: Map<ProviderKey, IProvider<any>> = new Map();
    private instances: Map<ProviderKey, any> = new Map();
    private parent: ServiceLocator;

    constructor(private strategy: IServiceLocatorStrategy, private hook: IHook = new Hook([])) {
        this.strategy.bindTo(this);
    }

    register(key: ProviderKey, provider: IProvider<unknown>): this {
        this.providers.set(key, provider);
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...deps: any[]): T {
        if (typeof key === 'string' || typeof key === 'symbol') {
            const instance = this.resolveLocally<T>(key, ...deps) || this.parent?.resolve<T>(key, ...deps);
            if (instance === undefined) {
                throw new DependencyNotFoundError(key.toString());
            }
            return instance;
        }
        return this.resolveConstructor(key, ...deps);
    }

    createContainer(): IServiceLocator {
        const locator = new ServiceLocator(this.strategy.clone(), this.hook.clone());
        locator.addTo(this);
        for (const [key, provider] of this.providers.entries()) {
            switch (provider.resolving) {
                case 'perScope':
                    locator.register(key, provider.clone({ resolving: 'singleton' }));
                    break;
                case 'perRequest':
                    locator.register(key, provider.clone());
            }
        }
        return locator;
    }

    remove(): void {
        this.hook.onContainerRemove();
        this.parent = null;
        this.instances.clear();
        this.providers.clear();
        this.hook.dispose();
        this.strategy.dispose();
    }

    addTo(locator: ServiceLocator): this {
        this.parent = locator;
        return this;
    }

    private resolveLocally<T>(key: ProviderKey, ...deps: any[]): T {
        const provider = this.providers.get(key);
        if (provider) {
            switch (provider.resolving) {
                case 'perRequest':
                    return this.resolvePerRequest(provider, ...deps);
                case 'singleton':
                    return this.resolveSingleton(key, provider, ...deps);
            }
        }
        return undefined;
    }

    private resolvePerRequest<T>(provider: IProvider<T>, ...deps: any[]): T {
        const instance = provider.resolve(this, ...deps);
        this.hook.onInstanceCreate(instance);
        return instance;
    }

    private resolveSingleton<T>(key: ProviderKey, value: IProvider<T>, ...deps: any[]): T {
        if (!this.instances.has(key)) {
            const instance = this.resolvePerRequest(value, ...deps);
            this.instances.set(key, instance);
        }

        return this.instances.get(key) as T;
    }

    private resolveConstructor<T>(c: constructor<T>, ...deps: any[]): T {
        const instance = this.strategy.resolveConstructor<T>(c, ...deps);
        this.hook.onInstanceCreate(instance);
        return instance;
    }
}
