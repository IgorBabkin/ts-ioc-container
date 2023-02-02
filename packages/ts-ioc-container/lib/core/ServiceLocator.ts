import { InjectionToken, IServiceLocator } from './IServiceLocator';
import { IInjector } from './IInjector';
import { IProvider, isProviderKey, ProviderKey, ScopeOptions, Tag } from './provider/IProvider';
import { EmptyServiceLocator } from './EmptyServiceLocator';
import { emptyHook, IInstanceHook } from './IInstanceHook';
import { ProviderRepo } from './ProviderRepo';
import { LocatorDisposedError } from '../errors/LocatorDisposedError';

export class ServiceLocator implements IServiceLocator, ScopeOptions {
    private readonly providers = new ProviderRepo();
    private parent: IServiceLocator = new EmptyServiceLocator();
    level = 0;
    tags: Tag[] = [];
    private hook: IInstanceHook = emptyHook;
    private isDisposed = false;

    constructor(private readonly injector: IInjector) {}

    setParent(parent: IServiceLocator): this {
        this.parent = parent;
        return this;
    }

    setTags(tags: Tag[]): this {
        this.tags = tags;
        return this;
    }

    setLevel(level = 0): this {
        this.level = level;
        return this;
    }

    setHook(hook: IInstanceHook): this {
        this.hook = hook;
        return this;
    }

    register(key: ProviderKey, provider: IProvider<unknown>): void {
        this.validateLocator();
        this.providers.set(key, provider);
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        this.validateLocator();
        if (isProviderKey(key)) {
            const provider = this.providers.get<T>(key);
            return provider?.isValid(this)
                ? this.hook.resolve(provider.resolve(this, ...args))
                : this.parent.resolve<T>(key, ...args);
        }

        return this.hook.resolve(this.injector.resolve<T>(this, key, ...args));
    }

    createScope(tags: Tag[] = [], parent: IServiceLocator = this): ServiceLocator {
        this.validateLocator();
        const scope = new ServiceLocator(this.injector)
            .setParent(parent)
            .setLevel(this.level + 1)
            .setTags(tags)
            .setHook(this.hook.clone());

        for (const [key, provider] of parent.entries()) {
            if (provider.isValid(scope)) {
                scope.register(key, provider.clone());
            }
        }
        return scope;
    }

    entries(): Array<[ProviderKey, IProvider<any>]> {
        return Array.from(new Map([...this.parent.entries(), ...this.providers.entries()]).entries());
    }

    dispose(): void {
        this.isDisposed = true;
        this.parent = new EmptyServiceLocator();
        this.providers.dispose();
        this.hook.dispose();
    }

    map<T extends IServiceLocator>(transform: (l: IServiceLocator) => T): T {
        this.parent = transform(this.parent);
        return transform(this);
    }

    private validateLocator(): void {
        if (this.isDisposed) {
            throw new LocatorDisposedError(`Locator is already disposed`);
        }
    }
}
