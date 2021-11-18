import { InjectionToken, IServiceLocator, isProviderKey, ProviderKey, RegisterOptions } from './IServiceLocator';
import { IInjector } from './IInjector';
import { IProvider, ScopeOptions, Tag } from './provider/IProvider';
import { ProviderKeyIsBusy } from '../errors/ProviderKeyIsBusy';
import { EmptyServiceLocator } from './EmptyServiceLocator';
import { id } from '../helpers/utils';
import { DIContainer } from './DIContainer';

export class ServiceLocator implements IServiceLocator {
    static fromInjector(injector: IInjector): ServiceLocator {
        return new ServiceLocator(new EmptyServiceLocator(), injector);
    }

    private readonly providers = new Map<ProviderKey, IProvider<any>>();

    constructor(
        private parent: IServiceLocator,
        private readonly injector: IInjector,
        readonly level: number = 0,
        readonly tags: Tag[] = [],
    ) {}

    register(key: ProviderKey, provider: IProvider<unknown>, options: Partial<RegisterOptions> = {}): void {
        if (options.noOverride && this.providers.has(key)) {
            throw new ProviderKeyIsBusy(key);
        }
        this.providers.set(key, provider);
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        if (isProviderKey(key)) {
            return this.findValidProvider<T>(key)?.resolve(this, ...args) ?? this.parent.resolve<T>(key, ...args);
        }

        return this.injector.resolve<T>(this, key, ...args);
    }

    private findValidProvider<T>(key: ProviderKey): IProvider<T> | undefined {
        if (!this.providers.has(key)) {
            return undefined;
        }

        const provider = this.providers.get(key) as IProvider<T>;

        if (!provider.isValid(this)) {
            return undefined;
        }

        return provider;
    }

    createScope(tags: Tag[] = [], parent: IServiceLocator = this): ServiceLocator {
        const scope = new ServiceLocator(parent, this.injector.clone(), this.level + 1, tags);
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
        this.injector.dispose();
        this.parent = new EmptyServiceLocator();
    }
}

export type MapFn<T> = (value: T) => T;

export class ContainerBuilder {
    constructor(
        private injector: IInjector,
        private parent: IServiceLocator = new EmptyServiceLocator(),
        private mapFn: MapFn<IServiceLocator> = id,
        private options: Partial<ScopeOptions> = {},
    ) {}

    mapLocator(fn: MapFn<IServiceLocator>): this {
        const oldFn = this.mapFn;
        this.mapFn = (value) => fn(oldFn(value));
        return this;
    }

    mapInjector(fn: MapFn<IInjector>): this {
        this.injector = fn(this.injector);
        return this;
    }

    withOptions(options: Partial<ScopeOptions>): this {
        this.options = options;
        return this;
    }

    build(): DIContainer {
        const parent = this.mapFn(this.parent);
        const locator = new ServiceLocator(parent, this.injector, this.options.level, this.options.tags);
        return new DIContainer(this.mapFn(locator));
    }
}
