import { IServiceLocator } from './IServiceLocator';
import { InjectionToken } from './strategy/ioc/decorators';
import { IServiceLocatorStrategy } from './strategy/IServiceLocatorStrategy';
import { IProvider, ProviderFn, ProviderKey } from './IProvider';
import { IInstanceHook } from './instanceHooks/IInstanceHook';
import { IStrategyFactory } from './strategy/IStrategyFactory';
import { constructor } from './types';
import { DependencyNotFoundError } from './errors/DependencyNotFoundError';

export class ServiceLocator<GContext> implements IServiceLocator<GContext> {
    private providers: Map<ProviderKey, IProvider<any>> = new Map();
    private instances: Map<ProviderKey, any> = new Map();
    private parent: ServiceLocator<unknown>;
    private strategy: IServiceLocatorStrategy;

    constructor(
        private strategyFactory: IStrategyFactory,
        public hooks: IInstanceHook[] = [],
        public context?: GContext,
    ) {
        this.strategy = strategyFactory.create(this);
    }

    public register(key: ProviderKey, provider: IProvider<unknown>): this {
        this.providers.set(key, provider);
        return this;
    }

    public resolve<T>(key: InjectionToken<T>, ...deps: any[]): T {
        if (typeof key === 'string' || typeof key === 'symbol') {
            const instance = this.resolveLocally<T>(key, ...deps) || this.parent?.resolve<T>(key, ...deps);
            if (!instance) {
                throw new DependencyNotFoundError(key.toString());
            }
            return instance;
        }
        return this.resolveConstructor(key, ...deps);
    }

    public createContainer<GChildContext>(context?: GChildContext): IServiceLocator<GChildContext> {
        const locator = new ServiceLocator(this.strategyFactory, this.hooks, context);
        locator.addTo(this);
        for (const [key, provider] of this.providers.entries()) {
            switch (provider.options.resolving) {
                case 'perScope':
                    locator.register(key, provider.clone({ resolving: 'singleton' }));
                    break;
                case 'perRequest':
                    locator.register(key, provider.clone());
            }
        }
        return locator;
    }

    public remove(): void {
        this.parent = null;
        this.instances = new Map();
        this.providers = new Map();
        this.strategy.dispose();
    }

    public addTo(locator: ServiceLocator<unknown>): this {
        this.parent = locator;
        return this;
    }

    private resolveLocally<T>(key: ProviderKey, ...deps: any[]): T {
        const provider = this.providers.get(key);
        if (provider) {
            const { resolving, argsFn } = provider.options;
            switch (resolving) {
                case 'perRequest':
                    return this.resolveFn(provider.fn, ...deps, ...argsFn(this));
                case 'singleton':
                    return this.resolveSingleton(key, provider.fn, ...deps, ...argsFn(this));
            }
        }
        return undefined;
    }

    private resolveFn<T>(fn: ProviderFn<T>, ...deps: any[]): T {
        const instance = fn(this, ...deps);
        for (const hook of this.hooks) {
            hook.onCreateInstance(instance);
        }
        return instance;
    }

    private resolveSingleton<T>(key: ProviderKey, value: ProviderFn<T>, ...deps: any[]): T {
        if (!this.instances.has(key)) {
            const instance = this.resolveFn(value, ...deps);
            this.instances.set(key, instance);
        }

        return this.instances.get(key) as T;
    }

    private resolveConstructor<T>(c: constructor<T>, ...deps: any[]): T {
        const instance = this.strategy.resolveConstructor<T>(c, ...deps);
        for (const hook of this.hooks) {
            hook.onCreateInstance(instance);
        }
        return instance;
    }
}
