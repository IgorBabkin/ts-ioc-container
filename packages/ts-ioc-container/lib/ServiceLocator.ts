import { InjectionToken, IServiceLocator, isProviderKey } from './IServiceLocator';
import { IInjector } from './injector/IInjector';
import { IProvider, ProviderKey } from './provider/IProvider';
import { constructor } from './helpers/types';
import { DependencyNotFoundError } from './errors/DependencyNotFoundError';
import { IHook } from './hooks/IHook';
import { Hook } from './hooks/Hook';
import { UnknownResolvingTypeError } from './errors/UnknownResolvingTypeError';

export class ServiceLocator implements IServiceLocator {
    private providers: Map<ProviderKey, IProvider<any>> = new Map();
    private instances: Map<ProviderKey, any> = new Map();
    private parent: ServiceLocator;

    constructor(private injector: IInjector, private hook: IHook = new Hook([])) {}

    register(key: ProviderKey, provider: IProvider<unknown>): this {
        this.providers.set(key, provider);
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        return isProviderKey(key) ? this.resolveProvider(key, ...args) : this.resolveConstructor(key, ...args);
    }

    createContainer(): IServiceLocator {
        const locator = new ServiceLocator(this.injector, this.hook.clone());
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
    }

    addTo(locator: ServiceLocator): this {
        this.parent = locator;
        return this;
    }

    private resolveProvider<T>(key: ProviderKey, ...args: any[]): T {
        const instance = this.resolveLocally<T>(key, ...args) || this.parent?.resolve<T>(key, ...args);
        if (instance === undefined) {
            throw new DependencyNotFoundError(key.toString());
        }
        return instance;
    }

    private resolveLocally<T>(key: ProviderKey, ...args: any[]): T {
        if (!this.providers.has(key)) {
            return undefined;
        }

        const provider = this.providers.get(key);
        switch (provider.resolving) {
            case 'perRequest':
                return this.resolvePerRequest(provider, ...args);
            case 'singleton':
                return this.resolveSingleton(key, provider, ...args);
            default:
                throw new UnknownResolvingTypeError(provider.resolving);
        }
    }

    private resolvePerRequest<T>(provider: IProvider<T>, ...args: any[]): T {
        const instance = provider.resolve(this, ...args);
        this.hook.onInstanceCreate(instance);
        return instance;
    }

    private resolveSingleton<T>(key: ProviderKey, value: IProvider<T>, ...args: any[]): T {
        if (!this.instances.has(key)) {
            this.instances.set(key, this.resolvePerRequest(value, ...args));
        }

        return this.instances.get(key) as T;
    }

    private resolveConstructor<T>(c: constructor<T>, ...args: any[]): T {
        const instance = this.injector.resolveConstructor<T>(this, c, ...args);
        this.hook.onInstanceCreate(instance);
        return instance;
    }
}
