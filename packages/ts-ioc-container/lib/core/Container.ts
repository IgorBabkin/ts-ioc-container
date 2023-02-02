import { InjectionToken, IContainer } from './IContainer';
import { IInjector } from './IInjector';
import { IProvider, isProviderKey, ScopeOptions, Tag } from './provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { emptyHook, IInstanceHook } from './IInstanceHook';
import { ProviderRepo } from './provider/ProviderRepo';
import { ContainerDisposedError } from '../errors/ContainerDisposedError';

export class Container implements IContainer, ScopeOptions {
    private readonly providers = new ProviderRepo();
    private parent: IContainer = new EmptyContainer();
    level = 0;
    tags: Tag[] = [];
    private hook: IInstanceHook = emptyHook;
    private isDisposed = false;

    constructor(private readonly injector: IInjector) {}

    setParent(parent: IContainer): this {
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

    register(provider: IProvider<unknown>): this {
        this.validateContainer();
        this.providers.add(provider);
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        this.validateContainer();
        if (isProviderKey(key)) {
            const provider = this.providers.get<T>(key);
            return provider?.isValid(this)
                ? this.hook.resolve(provider.resolve(this, ...args))
                : this.parent.resolve<T>(key, ...args);
        }

        return this.hook.resolve(this.injector.resolve<T>(this, key, ...args));
    }

    createScope(tags: Tag[] = [], parent: IContainer = this): Container {
        this.validateContainer();
        const scope = new Container(this.injector)
            .setParent(parent)
            .setLevel(this.level + 1)
            .setTags(tags)
            .setHook(this.hook.clone());

        for (const provider of parent.getProviders().filter((p) => p.isValid(scope))) {
            scope.register(provider.clone());
        }
        return scope;
    }

    getProviders(): IProvider<unknown>[] {
        return this.providers.merge(this.parent.getProviders());
    }

    dispose(): void {
        this.isDisposed = true;
        this.parent = new EmptyContainer();
        this.providers.dispose();
        this.hook.dispose();
    }

    map<T extends IContainer>(transform: (l: IContainer) => T): T {
        this.parent = transform(this.parent);
        return transform(this);
    }

    private validateContainer(): void {
        ContainerDisposedError.assert(!this.isDisposed, 'Container is already disposed');
    }
}
