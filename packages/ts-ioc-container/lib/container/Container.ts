import {
  Alias,
  AliasPredicate,
  DependencyKey,
  IContainer,
  IContainerModule,
  InjectionToken,
  isConstructor,
  Tag,
} from './IContainer';
import { IInjector } from '../injector/IInjector';
import { IProvider } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { ContainerDisposedError } from '../errors/ContainerDisposedError';
import { constructor } from '../utils';

export class Container implements IContainer {
  private readonly providers = new Map<DependencyKey, IProvider>();
  private readonly aliases: Map<DependencyKey, Alias[]> = new Map();
  private tags: Set<Tag>;
  private isDisposed = false;
  private parent: IContainer;
  private scopes = new Set<IContainer>();
  private instances = new Set<unknown>();

  constructor(
    private readonly injector: IInjector,
    options: { parent?: IContainer; tags?: Tag[] } = {},
  ) {
    this.parent = options.parent ?? new EmptyContainer();
    this.tags = new Set(options.tags ?? []);
  }

  register(key: DependencyKey, provider: IProvider, aliases?: Alias[]): this {
    this.validateContainer();

    this.providers.set(key, provider);
    if (aliases && aliases.length > 0) {
      this.aliases.set(key, aliases);
    }

    return this;
  }

  resolve<T>(token: InjectionToken<T>, ...args: unknown[]): T {
    this.validateContainer();

    if (isConstructor(token)) {
      return this.resolveByConstructor(token, ...args);
    }

    const provider = this.providers.get(token) as IProvider<T> | undefined;
    return provider?.isValidToResolve(this)
      ? provider.resolve(this, ...args)
      : this.parent.resolveFromChild<T>(token, ...args);
  }

  resolveFromChild<T>(token: InjectionToken<T>, ...args: unknown[]): T {
    this.validateContainer();

    if (isConstructor(token)) {
      return this.resolveByConstructor(token, ...args);
    }

    const provider = this.providers.get(token) as IProvider<T> | undefined;
    return provider?.isValidToResolve(this, true)
      ? provider.resolve(this, ...args)
      : this.parent.resolveFromChild<T>(token, ...args);
  }

  private resolveByConstructor<T>(token: constructor<T>, ...args: unknown[]): T {
    const instance = this.injector.resolve(this, token, ...args);
    this.instances.add(instance);
    return instance;
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
    return this.tags.has(tag);
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

  getKeysByAlias(predicate: AliasPredicate): DependencyKey[] {
    const result = new Set<DependencyKey>(this.parent.getKeysByAlias(predicate));
    for (const [key, aliases] of this.aliases.entries()) {
      if (predicate(aliases)) {
        result.add(key);
      }
    }
    return Array.from(result);
  }

  /**
   * @private
   */
  cloneValidProvidersFrom(source: IContainer): void {
    for (const [key, provider] of source.getAllProviders()) {
      if (provider.isValidToClone(this)) {
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
