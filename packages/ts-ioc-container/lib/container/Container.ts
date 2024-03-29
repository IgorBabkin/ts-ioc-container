import { DependencyKey, IContainer, IContainerModule, InjectionToken, isConstructor, Tag } from './IContainer';
import { IInjector } from '../injector/IInjector';
import { IProvider } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { ContainerDisposedError } from '../errors/ContainerDisposedError';

export class Container implements IContainer {
  readonly providers = new Map<DependencyKey, IProvider>();
  private readonly tags: Tag[];
  private isDisposed = false;
  private parent: IContainer;
  private scopes: Set<IContainer> = new Set();
  private instances: Set<unknown> = new Set();

  constructor(
    private readonly injector: IInjector,
    options: { parent?: IContainer; tags?: Tag[] } = {},
  ) {
    this.parent = options.parent ?? new EmptyContainer();
    this.tags = options.tags ?? [];
  }

  register(key: DependencyKey, provider: IProvider): this {
    this.validateContainer();
    this.providers.set(key, provider);
    return this;
  }

  resolve<T>(token: InjectionToken<T>, ...args: unknown[]): T {
    this.validateContainer();

    if (isConstructor(token)) {
      const instance = this.injector.resolve(this, token, ...args);
      this.instances.add(instance);
      return instance;
    }

    const provider = this.providers.get(token) as IProvider<T> | undefined;
    return provider?.isValid(this) ? provider.resolve(this, ...args) : this.parent.resolve<T>(token, ...args);
  }

  getTokensByProvider(predicate: (provider: IProvider) => boolean): DependencyKey[] {
    const keys = new Set<DependencyKey>(this.parent.getTokensByProvider(predicate));

    for (const [key, provider] of this.providers) {
      if (predicate(provider)) {
        keys.add(key);
      }
    }

    return Array.from(keys);
  }

  createScope(...tags: Tag[]): Container {
    this.validateContainer();

    const scope = new Container(this.injector, { parent: this, tags });
    scope.cloneValidProvidersFrom(this);
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

  getInstances(): unknown[] {
    const instances: unknown[] = Array.from(this.instances);
    for (const scope of this.scopes) {
      instances.push(...scope.getInstances());
    }
    return instances;
  }

  hasTag(tag: Tag): boolean {
    return this.tags.includes(tag);
  }

  use(...modules: IContainerModule[]): this {
    for (const module of modules) {
      module.applyTo(this);
    }
    return this;
  }

  hasDependency(key: DependencyKey): boolean {
    return this.providers.has(key) ?? this.parent.hasDependency(key);
  }

  /**
   * @private
   */
  cloneValidProvidersFrom(source: IContainer): void {
    for (const [key, provider] of source.getAllProviders()) {
      if (provider.isValid(this)) {
        this.providers.set(key, provider.clone());
      }
    }
  }

  /**
   * @private
   */
  getAllProviders(): Map<DependencyKey, IProvider> {
    return new Map([...this.parent.getAllProviders(), ...this.providers]);
  }

  /**
   * @private
   */
  removeScope(child: IContainer): void {
    this.scopes.delete(child);
  }

  private validateContainer(): void {
    ContainerDisposedError.assert(!this.isDisposed, 'Container is already disposed');
  }
}
