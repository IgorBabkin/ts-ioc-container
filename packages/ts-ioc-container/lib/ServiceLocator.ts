import { constructor, IServiceLocator } from './IServiceLocator';
import { InjectionToken } from './strategy/ioc/decorators';
import { IServiceLocatorStrategy } from './strategy/IServiceLocatorStrategy';
import { IProviderOptions, IRegistration, RegistrationFn, RegistrationKey } from './IRegistration';
import { IInstanceHook } from './instanceHooks/IInstanceHook';
import { IStrategyFactory } from './strategy/IStrategyFactory';

export class ServiceLocator implements IServiceLocator {
    private registrations: Map<RegistrationKey, IRegistration<any>> = new Map();
    private instances: Map<RegistrationKey, any> = new Map();
    private parent: ServiceLocator;
    private strategy: IServiceLocatorStrategy;

    constructor(private strategyFactory: IStrategyFactory, private hooks: IInstanceHook) {
        this.strategy = strategyFactory.create(this);
    }

    public resolve<T>(c: InjectionToken<T>, ...deps: any[]): T {
        if (typeof c === 'string' || typeof c === 'symbol') {
            return this.resolveByKey(c, ...deps);
        }
        return this.resolveConstructor(c, ...deps);
    }

    public createContainer(): IServiceLocator {
        const locator = new ServiceLocator(this.strategyFactory, this.hooks);
        locator.addTo(this);
        for (const [key, { options, fn }] of this.registrations.entries()) {
            if (options?.resolving === 'perScope') {
                locator.registerFunction(key, fn, { resolving: 'singleton' });
            }
        }
        return locator;
    }

    public remove(): void {
        this.parent = null;
        for (const instance of this.instances.values()) {
            this.hooks.onRemoveInstance(instance);
        }
        this.instances = new Map();
        this.registrations = new Map();
        this.strategy.dispose();
    }

    public addTo(locator: ServiceLocator): this {
        this.parent = locator;
        return this;
    }

    public has(key: RegistrationKey): boolean {
        for (const registrationKey of this.registrations.keys()) {
            if (registrationKey === key) {
                return true;
            }
        }
        return false;
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

    private resolveByKey<GInstance>(key: RegistrationKey, ...deps: any[]): GInstance {
        const instance = this.resolveLocally<GInstance>(key, ...deps) || this.parent?.resolve<GInstance>(key, ...deps);
        if (!instance) {
            throw new Error(`ServiceLocator: cannot find ${key.toString()}`);
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
        this.hooks.onCreateInstance(instance);
        return instance;
    }

    private resolveConstructor<T>(c: constructor<T>, ...deps: any[]): T {
        const instance = this.strategy.resolveConstructor(c, ...deps);
        this.hooks.onCreateInstance(instance);
        return instance;
    }
}
