import { IContainer, InjectionToken } from './IContainer';
import { IInjector } from '../IInjector';
import { IProvider, isProviderKey, Tagged, Tag } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { ProviderRepo } from '../provider/ProviderRepo';
import { ContainerDisposedError } from './ContainerDisposedError';

export class Container implements IContainer, Tagged {
    private readonly providers = new ProviderRepo();
    readonly tags: Tag[];
    private isDisposed = false;
    private parent: IContainer;
    private children: Set<IContainer> = new Set();
    private instances: Set<unknown> = new Set();

    constructor(private readonly injector: IInjector, options: { parent?: IContainer; tags?: Tag[] } = {}) {
        this.parent = options.parent ?? new EmptyContainer();
        this.tags = options.tags ?? [];
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
            return provider?.isValid(this) ? provider.resolve(this, ...args) : this.parent.resolve<T>(key, ...args);
        }

        const instance = this.injector.resolve<T>(this, key, ...args);
        this.instances.add(instance);
        return instance;
    }

    createScope(tags: Tag[] = []): Container {
        this.validateContainer();
        const scope = new Container(this.injector, { parent: this, tags });

        for (const provider of this.getProviders().filter((p) => p.isValid(scope))) {
            scope.register(provider.clone());
        }

        this.children.add(scope);

        return scope;
    }

    dispose(): void {
        this.isDisposed = true;
        this.parent.removeScope(this);
        this.parent = new EmptyContainer();
        for (const child of this.children) {
            child.dispose();
        }
        this.providers.dispose();
        this.instances.clear();
    }

    getProviders(): IProvider<unknown>[] {
        return this.providers.merge(this.parent.getProviders());
    }

    getInstances(): unknown[] {
        let instances = Array.from(this.instances);
        for (const child of this.children) {
            instances = instances.concat(child.getInstances());
        }
        return instances;
    }

    removeScope(child: IContainer): void {
        this.children.delete(child);
    }

    private validateContainer(): void {
        ContainerDisposedError.assert(!this.isDisposed, 'Container is already disposed');
    }
}
