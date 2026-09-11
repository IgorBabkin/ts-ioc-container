import {
  type AutoResolveOptions,
  type CreateScopeOptions,
  type DependencyKey,
  type IContainer,
  type IContainerModule,
  type RegisteredHook,
  type RegisterOptions,
  ResolveManyOptions,
  type ResolveOneOptions,
  type ScopeHook,
  type Tag,
} from './IContainer';
import { type IInjector } from '../injector/IInjector';
import { type IProvider } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { type IRegistration } from '../registration/IRegistration';
import { ContainerDisposedError } from '../errors/ContainerDisposedError';
import { MetadataInjector } from '../injector/MetadataInjector';
import { AliasMap } from './AliasMap';
import { unwrapProxy } from '../utils/ProxyRegistry';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';
import { constructor, Instance, Is } from '../utils/basic';
import { Filter as F } from '../utils/array';
import { type ITypedEvent, TypedEvent } from '../utils/TypedEvent';

export class Container implements IContainer {
  isDisposed = false;
  private parent: IContainer;
  private scopes: IContainer[] = [];
  private readonly instances = new Set<Instance>();
  private registrations: IRegistration[] = [];
  private readonly tags: Set<Tag>;
  private readonly providers = new Map<DependencyKey, IProvider>();
  private readonly aliases = new AliasMap();
  private readonly injector: IInjector;

  // The concrete events stay private so `emit` is this container's alone; the
  // public properties expose the subscriber's side only.
  private readonly scopeCreatedEvent = new TypedEvent<[IContainer]>();
  private readonly scopeDisposedEvent = new TypedEvent<[IContainer]>();
  private readonly registeredEvent = new TypedEvent<[IProvider, DependencyKey, IContainer]>();
  readonly scopeCreated: ITypedEvent<[IContainer]> = this.scopeCreatedEvent;
  readonly scopeDisposed: ITypedEvent<[IContainer]> = this.scopeDisposedEvent;
  readonly registered: ITypedEvent<[IProvider, DependencyKey, IContainer]> = this.registeredEvent;

  constructor(
    options: {
      injector?: IInjector;
      parent?: IContainer;
      tags?: Tag[];
    } = {},
  ) {
    this.injector = options.injector ?? new MetadataInjector();
    this.parent = options.parent ?? new EmptyContainer();
    this.tags = new Set(options.tags ?? []);
  }

  /**
   * @throws {ContainerDisposedError} when the container has already been disposed.
   */
  register(key: DependencyKey, provider: IProvider, { aliases = [] }: RegisterOptions = {}): this {
    this.validateContainer();
    this.providers.set(key, provider);
    this.aliases.setAliasesByKey(key, aliases);

    // Hooks run once the provider and its aliases are in place, so they observe a resolvable key.
    this.registeredEvent.emit(provider, key, this);

    return this;
  }

  /**
   * @throws {ContainerDisposedError} when the container has already been disposed.
   * @throws {DependencyNotFoundError} when `target` cannot be resolved in this container or any parent scope.
   */
  resolve<T>(target: constructor<T> | DependencyKey, { args = [], child = this, lazy }: ResolveOneOptions = {}): T {
    this.validateContainer();

    if (Is.constructor(target)) {
      return this.injector.resolve(this, target, { args, lazy });
    }

    const provider = this.providers.get(target) as IProvider<T> | undefined;

    return provider?.hasAccess({ invocationScope: child, providerScope: this, args })
      ? provider.resolve(this, { args, lazy })
      : this.parent.resolve<T>(target, { args, child, lazy });
  }

  /**
   * @throws {ContainerDisposedError} when the container has already been disposed.
   * @throws {DependencyNotFoundError} when a key registered under `alias` has no matching provider.
   */
  resolveByAlias<T>(
    alias: DependencyKey,
    { args = [], child = this, lazy, excludedKeys = [] }: ResolveManyOptions = {},
  ): T[] {
    this.validateContainer();

    const keys: DependencyKey[] = [];
    const deps: T[] = [];
    for (const key of this.aliases.getKeysByAlias(alias).filter(F.exclude(excludedKeys))) {
      const provider = this.findProviderByKeyOrFail<T>(key);
      if (!provider.hasAccess({ invocationScope: child, providerScope: this, args })) {
        continue;
      }
      keys.push(key);
      deps.push(provider.resolve(this, { args, lazy }));
    }

    const parentDeps = this.parent.resolveByAlias<T>(alias, {
      args,
      child,
      lazy,
      excludedKeys: [...excludedKeys, ...keys],
    });
    return [...deps, ...parentDeps];
  }

  /**
   * @throws {ContainerDisposedError} when the container has already been disposed.
   * @throws {DependencyNotFoundError} when `alias` cannot be resolved in this container or any parent scope.
   */
  resolveOneByAlias<T>(alias: DependencyKey, { args = [], child = this, lazy }: ResolveOneOptions = {}): T {
    this.validateContainer();

    const [key] = this.aliases.getKeysByAlias(alias);
    const provider = key ? this.findProviderByKeyOrFail<T>(key) : undefined;

    return provider?.hasAccess({ invocationScope: child, providerScope: this, args })
      ? provider.resolve(this, { args, lazy })
      : this.parent.resolveOneByAlias<T>(alias, { args, child, lazy });
  }

  /**
   * @throws {ContainerDisposedError} when the container has already been disposed.
   */
  createScope({ tags }: CreateScopeOptions = {}): IContainer {
    this.validateContainer();

    // Injector hooks need no copying - the child shares this scope's injector, so it shares its hooks.
    const scope = new Container({ injector: this.injector, parent: this, tags })
      .onScopeCreated(...this.scopeCreatedEvent.getListeners())
      .onScopeDisposed(...this.scopeDisposedEvent.getListeners())
      .onRegistered(...this.registeredEvent.getListeners());

    for (const registration of this.getRegistrations()) {
      registration.applyTo(scope);
    }
    this.scopes.push(scope);

    // Hooks run once the scope is fully registered and attached, so they observe a usable scope.
    this.scopeCreatedEvent.emit(scope);

    return scope;
  }

  /**
   * Eagerly resolves every provider of this scope which was marked with `autoResolve()`.
   *
   * `args` are forwarded to each of those providers, exactly as `resolve` forwards them.
   *
   * @throws {ContainerDisposedError} when the container has already been disposed.
   */
  autoResolve({ args = [] }: AutoResolveOptions = {}): this {
    this.validateContainer();

    for (const provider of this.providers.values()) {
      if (provider.isAutoResolvable() && provider.hasAccess({ invocationScope: this, providerScope: this, args })) {
        provider.resolve(this, { args });
      }
    }

    return this;
  }

  /**
   * @throws {ContainerDisposedError} when the container has already been disposed.
   */
  dispose(): void {
    this.validateContainer();
    this.isDisposed = true;

    this.scopeDisposedEvent.emit(this);

    // Detach from parent
    this.parent.removeScope(this);
    this.parent = new EmptyContainer();

    // Reset the state
    for (const provider of this.providers.values()) {
      provider.dispose();
    }
    this.providers.clear();
    this.aliases.destroy();
    this.instances.clear();
    this.registrations = [];

    // Dispose scope events. Injector hooks are not this scope's to clear - the injector outlives it.
    this.scopeCreatedEvent.dispose();
    this.scopeDisposedEvent.dispose();
    this.registeredEvent.dispose();
  }

  addRegistration(registration: IRegistration): this {
    this.registrations.push(registration);
    registration.applyTo(this);
    return this;
  }

  getRegistrations(): IRegistration[] {
    return [...this.parent.getRegistrations(), ...this.registrations];
  }

  getInjector(): IInjector {
    return this.injector;
  }

  hasRegistration(key: DependencyKey): boolean {
    return this.registrations.some((r) => r.getKeyOrFail() === key) || this.parent.hasRegistration(key);
  }

  /**
   * @throws {TypedEventDisposedError} when the container has already been disposed.
   */
  onScopeCreated(...hooks: ScopeHook[]): this {
    hooks.forEach((hook) => this.scopeCreatedEvent.subscribe(hook));
    return this;
  }

  /**
   * @throws {TypedEventDisposedError} when the container has already been disposed.
   */
  onScopeDisposed(...hooks: ScopeHook[]): this {
    hooks.forEach((hook) => this.scopeDisposedEvent.subscribe(hook));
    return this;
  }

  /**
   * @throws {TypedEventDisposedError} when the container has already been disposed.
   */
  onRegistered(...hooks: RegisteredHook[]): this {
    hooks.forEach((hook) => this.registeredEvent.subscribe(hook));
    return this;
  }

  addInstance(instance: Instance) {
    this.instances.add(instance);
  }

  getScopes() {
    return [...this.scopes];
  }

  /**
   * Whether this scope created `instance`.
   *
   * A proxy stands for the object behind it, so it is unwrapped before the
   * lookup - the container tracks real instances, and a caller asking about a
   * proxy is asking about its target. Resolving a lazy proxy's target is what
   * makes that answer possible, so a still-unresolved lazy proxy is resolved
   * here.
   */
  hasInstance(instance: Instance): boolean {
    return this.instances.has(unwrapProxy(instance));
  }

  removeScope(child: IContainer): void {
    this.scopes = this.scopes.filter((s) => s !== child);
  }

  useModule(module: IContainerModule): this {
    module.applyTo(this);
    return this;
  }

  getParent() {
    return this.parent;
  }

  getInstances(cascade: boolean = false) {
    if (!cascade) {
      return [...this.instances];
    }
    return [...this.instances, ...this.scopes.flatMap((s) => s.getInstances(true))];
  }

  hasTag(tag: Tag) {
    return this.tags.has(tag);
  }

  addTags(...tags: Tag[]) {
    for (const tag of tags) {
      this.tags.add(tag);
    }
  }

  /**
   * @throws {ContainerDisposedError} when the container has already been disposed.
   */
  private validateContainer(): void {
    if (this.isDisposed) {
      throw new ContainerDisposedError('Container is already disposed');
    }
  }

  /**
   * @throws {DependencyNotFoundError} when no provider is registered under `key` in this container.
   */
  private findProviderByKeyOrFail<T>(key: DependencyKey): IProvider<T> {
    if (!this.providers.has(key)) {
      throw new DependencyNotFoundError(`Provider ${key.toString()} does not exist`);
    }
    return this.providers.get(key)!;
  }
}
