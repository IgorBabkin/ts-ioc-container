import { IContainer, IModule, InjectionToken } from './IContainer';
import { IInjector } from '../IInjector';
import { IProvider, isProviderKey, ProviderKey, Tag, Tagged } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { ProviderRepo } from '../provider/ProviderRepo';
import { ContainerDisposedError } from './ContainerDisposedError';
import { constructor } from '../utils';

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

    register(key: ProviderKey, provider: IProvider): this {
        this.validateContainer();
        this.providers.add(key, provider);
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...args: unknown[]): T {
        this.validateContainer();
        return isProviderKey(key) ? this.resolveByProvider(key, ...args) : this.resolveByInjector(key, ...args);
    }

    private resolveByProvider<T>(key: string | symbol, ...args: unknown[]): T {
        const provider = this.providers.find<T>(key);
        return provider?.isValid(this) ? provider.resolve(this, ...args) : this.parent.resolve<T>(key, ...args);
    }

    private resolveByInjector<T>(key: constructor<T>, ...args: unknown[]): T {
        const instance = this.injector.resolve(this, key, ...args);
        this.instances.add(instance);
        return instance;
    }

    createScope(tags: Tag[] = []): Container {
        this.validateContainer();
        const scope = new Container(this.injector, { parent: this, tags });

        for (const [key, provider] of this.getProviders().entries()) {
            if (provider.isValid(scope)) {
                scope.register(key, provider.clone());
            }
        }

        this.children.add(scope);

        return scope;
    }

    dispose(): void {
        this.validateContainer();
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

    add(module: IModule): this {
        module.applyTo(this);
        return this;
    }

    private validateContainer(): void {
        ContainerDisposedError.assert(!this.isDisposed, 'Container is already disposed');
    }
}
