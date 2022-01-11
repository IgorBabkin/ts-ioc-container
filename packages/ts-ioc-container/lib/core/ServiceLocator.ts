import { InjectionToken, IServiceLocator, isProviderKey, ProviderKey, RegisterOptions } from './IServiceLocator';
import { IInjector } from './IInjector';
import { IProvider, Tag } from './provider/IProvider';
import { ProviderKeyIsBusy } from '../errors/ProviderKeyIsBusy';
import { EmptyServiceLocator } from './EmptyServiceLocator';
import { emptyHook, IInstanceHook } from './IInstanceHook';

export class ServiceLocator implements IServiceLocator {
    static fromInjector(injector: IInjector): ServiceLocator {
        return new ServiceLocator(new EmptyServiceLocator(), injector);
    }

    private instances = new Set();
    private readonly providers = new Map<ProviderKey, IProvider<any>>();

    constructor(
        private parent: IServiceLocator,
        private readonly injector: IInjector,
        readonly level: number = 0,
        readonly tags: Tag[] = [],
        private hook: IInstanceHook = emptyHook,
    ) {}

    register(key: ProviderKey, provider: IProvider<unknown>, options: Partial<RegisterOptions> = {}): void {
        if (options.noOverride && this.providers.has(key)) {
            throw new ProviderKeyIsBusy(key);
        }
        this.providers.set(key, provider);
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        if (isProviderKey(key)) {
            const provider = this.findValidProvider<T>(key);
            return provider ? this.onResolve(provider.resolve(this, ...args)) : this.parent.resolve<T>(key, ...args);
        }

        return this.onResolve(this.injector.resolve<T>(this, key, ...args));
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
        const scope = new ServiceLocator(parent, this.injector, this.level + 1, tags, this.hook);
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
        this.parent = new EmptyServiceLocator();

        for (const p of this.providers.values()) {
            p.dispose();
        }
        this.providers.clear();

        for (const it of this.instances) {
            this.hook.onDispose(it);
        }
        this.instances.clear();
    }

    private onResolve<T>(instance: T): T {
        if (!this.instances.has(instance)) {
            this.instances.add(instance);
            this.hook.onConstruct(instance);
        }
        return this.hook.onResolve(instance);
    }
}
