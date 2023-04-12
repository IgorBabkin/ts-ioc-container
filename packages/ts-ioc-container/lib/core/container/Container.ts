import { IContainer, InjectionToken } from './IContainer';
import { IInjector } from '../IInjector';
import { IProvider, isProviderKey, Tagged, Tag } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { ProviderRepo } from '../provider/ProviderRepo';
import { ContainerDisposedError } from './ContainerDisposedError';

export class Container implements IContainer, Tagged {
    private readonly providers = new ProviderRepo();
    tags: Tag[];
    private isDisposed = false;
    private parent: IContainer;

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

        return this.injector.resolve<T>(this, key, ...args);
    }

    createScope(tags: Tag[] = [], parent: IContainer = this): Container {
        this.validateContainer();
        const scope = new Container(this.injector.clone(), { parent, tags });

        for (const provider of parent.getProviders().filter((p) => p.isValid(scope))) {
            scope.register(provider.clone());
        }

        return scope;
    }

    dispose(): void {
        this.isDisposed = true;
        this.parent = new EmptyContainer();
        this.providers.dispose();
        this.injector.dispose();
    }

    getProviders(): IProvider<unknown>[] {
        return this.providers.merge(this.parent.getProviders());
    }

    getInstances(): unknown[] {
        return this.injector.getInstances();
    }

    map<T extends IContainer>(transform: (l: IContainer) => T): T {
        this.parent = transform(this.parent);
        return transform(this);
    }

    private validateContainer(): void {
        ContainerDisposedError.assert(!this.isDisposed, 'Container is already disposed');
    }
}
