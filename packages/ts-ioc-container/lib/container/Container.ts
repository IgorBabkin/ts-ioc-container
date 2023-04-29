import { IContainer, InjectionToken } from './IContainer';
import { IInjector } from '../IInjector';
import { IProvider, isProviderKey, ProviderKey, Tag, Tagged } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { ProviderRepo } from '../provider/ProviderRepo';
import { ContainerDisposedError } from './ContainerDisposedError';
import { Registration } from '../registration/Registration';

export class Container implements IContainer, Tagged {
    private readonly providers = new ProviderRepo();
    private readonly tags: Tag[];
    private isDisposed = false;
    private parent: IContainer;
    private children: Set<IContainer> = new Set();
    private instances: Set<unknown> = new Set();

    constructor(private readonly injector: IInjector, options: { parent?: IContainer; tags?: Tag[] } = {}) {
        this.parent = options.parent ?? new EmptyContainer();
        this.tags = options.tags ?? [];
    }

    register({ key, provider }: Registration): this {
        this.validateContainer();
        this.providers.add(key, provider);
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...args: unknown[]): T {
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

        for (const [key, provider] of this.getProviders().entries()) {
            if (provider.isValid(scope)) {
                scope.register({ key, provider: provider.clone() });
            }
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

    getProviders(): Map<ProviderKey, IProvider> {
        return this.providers.merge(this.parent.getProviders());
    }

    getInstances(): unknown[] {
        const instances: unknown[] = Array.from(this.instances);
        for (const child of this.children) {
            instances.push(...child.getInstances());
        }
        return instances;
    }

    removeScope(child: IContainer): void {
        this.children.delete(child);
    }

    hasTag(tag: Tag): boolean {
        return this.tags.includes(tag);
    }

    private validateContainer(): void {
        ContainerDisposedError.assert(!this.isDisposed, 'Container is already disposed');
    }
}
