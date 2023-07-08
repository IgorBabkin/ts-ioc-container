import {
    DependencyKey,
    IContainer,
    IContainerModule,
    InjectionToken,
    isDependencyKey,
    Tag,
    Tagged,
} from './IContainer';
import { IInjector } from '../injector/IInjector';
import { IProvider } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { ContainerDisposedError } from './ContainerDisposedError';
import { constructor } from '../utils';

export class Container implements IContainer, Tagged {
    private readonly providers = new Map<DependencyKey, IProvider>();
    private readonly tags: Tag[];
    private isDisposed = false;
    private parent: IContainer;
    private scopes: Set<IContainer> = new Set();
    private instances: Set<unknown> = new Set();

    constructor(private readonly injector: IInjector, options: { parent?: IContainer; tags?: Tag[] } = {}) {
        this.parent = options.parent ?? new EmptyContainer();
        this.tags = options.tags ?? [];
    }

    register(key: DependencyKey, provider: IProvider): this {
        this.validateContainer();
        this.providers.set(key, provider);
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...args: unknown[]): T {
        this.validateContainer();
        return isDependencyKey(key) ? this.resolveByProvider(key, ...args) : this.resolveByInjector(key, ...args);
    }

    private resolveByProvider<T>(key: string | symbol, ...args: unknown[]): T {
        const provider = this.providers.get(key) as IProvider<T> | undefined;
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

        for (const [key, provider] of this.getProviders()) {
            if (provider.isValid(scope)) {
                scope.register(key, provider.clone());
            }
        }

        this.scopes.add(scope);

        return scope;
    }

    dispose(): void {
        this.validateContainer();
        this.isDisposed = true;
        this.parent.removeScope(this);
        this.parent = new EmptyContainer();
        for (const scope of this.scopes) {
            scope.dispose();
        }
        this.providers.clear();
        this.instances.clear();
    }

    getProviders(): Map<DependencyKey, IProvider> {
        return new Map([...this.parent.getProviders(), ...this.providers]);
    }

    getInstances(): unknown[] {
        const instances: unknown[] = Array.from(this.instances);
        for (const scope of this.scopes) {
            instances.push(...scope.getInstances());
        }
        return instances;
    }

    removeScope(child: IContainer): void {
        this.scopes.delete(child);
    }

    hasTag(tag: Tag): boolean {
        return this.tags.includes(tag);
    }

    add(module: IContainerModule): this {
        module.applyTo(this);
        return this;
    }

    private validateContainer(): void {
        ContainerDisposedError.assert(!this.isDisposed, 'Container is already disposed');
    }
}
