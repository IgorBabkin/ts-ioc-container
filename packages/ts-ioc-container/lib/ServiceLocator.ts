import { InjectionToken, IServiceLocator, isProviderKey } from './IServiceLocator';
import { IInjector } from './injector/IInjector';
import { IProvider, ProviderKey } from './provider/IProvider';
import { constructor } from './helpers/types';
import { DependencyNotFoundError } from './errors/DependencyNotFoundError';
import { IHook } from './hooks/IHook';
import { UnknownResolvingTypeError } from './errors/UnknownResolvingTypeError';
import { IInjectorFactory } from './injector/IInjectorFactory';
import { IHookFactory } from './hooks/IHookFactory';
import { HookFactory } from './hooks/HookFactory';

export class ServiceLocator implements IServiceLocator {
    private readonly providers: Map<ProviderKey, IProvider<any>> = new Map();
    private readonly instances: Map<ProviderKey, any> = new Map();
    private readonly injector: IInjector;
    private readonly hook: IHook;

    constructor(
        private injectorFactory: IInjectorFactory,
        private hookFactory: IHookFactory = new HookFactory(),
        private parent?: IServiceLocator,
    ) {
        this.injector = injectorFactory.create(this);
        this.hook = hookFactory.create();
    }

    register(key: ProviderKey, provider: IProvider<unknown>): this {
        this.providers.set(key, provider);
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        return isProviderKey(key) ? this.resolveProvider(key, ...args) : this.resolveConstructor(key, ...args);
    }

    createContainer(): IServiceLocator {
        const locator = new ServiceLocator(this.injectorFactory, this.hookFactory, this);
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
        this.parent = null;
        this.hook.onContainerRemove();
        this.instances.clear();
        this.providers.clear();
        this.hook.dispose();
    }

    private resolveProvider<T>(key: ProviderKey, ...args: any[]): T {
        const instance = this.resolveLocally<T>(key, ...args) || this.parent?.resolve<T>(key, ...args);
        if (instance === undefined) {
            throw new DependencyNotFoundError(key.toString());
        }
        return instance;
    }

    private resolveLocally<T>(key: ProviderKey, ...args: any[]): T {
        const provider = this.providers.get(key);
        if (!provider) {
            return undefined;
        }

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

    private resolveConstructor<T>(value: constructor<T>, ...args: any[]): T {
        const instance = this.injector.resolve<T>(value, ...args);
        this.hook.onInstanceCreate(instance);
        return instance;
    }
}
