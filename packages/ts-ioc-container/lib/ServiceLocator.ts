import { IServiceLocator } from './IServiceLocator';
import { InjectionToken } from './strategy/ioc/decorators';
import { IServiceLocatorStrategy } from './strategy/IServiceLocatorStrategy';
import { IProviderOptions, IRegistration, RegistrationFn, RegistrationKey } from './IRegistration';
import { IInstanceHook } from './instanceHooks/IInstanceHook';
import { IStrategyFactory } from './strategy/IStrategyFactory';
import { constructor } from './types';

export class ServiceLocator<GContext> implements IServiceLocator<GContext> {
    private registrations: Map<RegistrationKey, IRegistration<any>> = new Map();
    private instances: Map<RegistrationKey, any> = new Map();
    private parent: ServiceLocator<unknown>;
    private strategy: IServiceLocatorStrategy;

    constructor(
        private strategyFactory: IStrategyFactory,
        public hooks: IInstanceHook[] = [],
        public context?: GContext,
    ) {
        this.strategy = strategyFactory.create(this);
    }

    public resolve<T>(key: InjectionToken<T>, ...deps: any[]): T {
        if (typeof key === 'string' || typeof key === 'symbol') {
            const instance = this.resolveLocally<T>(key, ...deps) || this.parent?.resolve<T>(key, ...deps);
            if (!instance) {
                throw new Error(`ServiceLocator: cannot find ${key.toString()}`);
            }
            return instance;
        }
        return this.resolveConstructor(key, ...deps);
    }

    public createContainer<GChildContext>(context?: GChildContext): IServiceLocator<GChildContext> {
        const locator = new ServiceLocator(this.strategyFactory, this.hooks, context);
        locator.addTo(this);
        for (const [key, { options, fn }] of this.registrations.entries()) {
            if (options?.resolving === 'perScope') {
                locator.registerFunction(key, fn, { resolving: 'singleton' });
            }
            switch (options?.resolving) {
                case 'perScope':
                    locator.registerFunction(key, fn, { resolving: 'singleton' });
                    break;
                case 'perRequest':
                    locator.registerFunction(key, fn, options);
            }
        }
        return locator;
    }

    public remove(): void {
        this.parent = null;
        this.instances = new Map();
        this.registrations = new Map();
        this.strategy.dispose();
    }

    public addTo(locator: ServiceLocator<unknown>): this {
        this.parent = locator;
        return this;
    }

    public registerConstructor<T>(
        key: RegistrationKey,
        value: constructor<T>,
        options: IProviderOptions = { resolving: 'perRequest' },
    ): this {
        this.registerFunction(key, (l, ...deps: any[]) => l.resolve(value, ...deps), options);
        return this;
    }

    public registerInstance<T>(key: RegistrationKey, value: T): this {
        this.registerFunction(key, () => value);
        return this;
    }

    public registerFunction<T>(
        key: RegistrationKey,
        resolveFn: RegistrationFn<T>,
        options: IProviderOptions = { resolving: 'perRequest' },
    ): this {
        this.registrations.set(key, {
            fn: resolveFn,
            options,
        });
        return this;
    }

    private resolveLocally<T>(key: RegistrationKey, ...deps: any[]): T {
        const registration = this.registrations.get(key);
        if (registration) {
            switch (registration.options.resolving) {
                case 'perRequest':
                    return this.resolveFn(registration.fn, ...deps);
                case 'singleton':
                    return this.resolveSingleton(key, registration.fn, ...deps);
            }
        }
        return undefined;
    }

    private resolveFn<T>(fn: RegistrationFn<T>, ...deps: any[]): T {
        const instance = fn(this, ...deps);
        for (const hook of this.hooks) {
            hook.onCreateInstance(instance);
        }
        return instance;
    }

    private resolveSingleton<T>(key: RegistrationKey, value: RegistrationFn<T>, ...deps: any[]): T {
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
