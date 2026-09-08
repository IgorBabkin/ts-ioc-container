import {
  type AutoResolveOptions,
  type CreateScopeOptions,
  type DependencyKey,
  type IContainer,
  type IContainerModule,
  type ProviderHook,
  type RegisterOptions,
  ResolveManyOptions,
  type ResolveOneOptions,
  type ScopeHook,
  type Tag,
} from './IContainer';
import { type IInjector } from '../injector/IInjector';
import { type IProvider, type ProviderOptions } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { type IRegistration } from '../registration/IRegistration';
import { ContainerDisposedError } from '../errors/ContainerDisposedError';
import { MetadataInjector } from '../injector/MetadataInjector';
import { AliasMap } from './AliasMap';
import { unwrapProxy } from '../utils/ProxyRegistry';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';
import { OnDisposeHook } from '../hooks/onContainerDisposed';
import { constructor, Instance, Is } from '../utils/basic';
import { Filter as F } from '../utils/array';
import { TransientProvider } from '../provider/TransientProvider';

export class Container implements IContainer {
  isDisposed = false;
  private parent: IContainer;
  private scopes: IContainer[] = [];
  private readonly instances = new Set<Instance>();
  private registrations: IRegistration[] = [];
  private readonly tags: Set<Tag>;
  private readonly providers = new Map<DependencyKey, IProvider>();
  private readonly transientProviders = new Map<constructor<unknown>, IProvider>();
  private readonly aliases = new AliasMap();
  private readonly injector: IInjector;

  private readonly onDisposeHookList: OnDisposeHook[] = [];
  private readonly onScopeCreatedHookList: ScopeHook[] = [];
  private readonly onProviderRegisteredHookList: ProviderHook[] = [];

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
    this.notifyProviderRegistered(provider);

    return this;
  }

  /**
   * @throws {ContainerDisposedError} when the container has already been disposed.
   * @throws {DependencyNotFoundError} when `target` cannot be resolved in this container or any parent scope.
   */
  resolve<T>(target: constructor<T> | DependencyKey, { args = [], child = this, lazy }: ResolveOneOptions = {}): T {
    this.validateContainer();

    const provider = Is.constructor(target)
      ? this.findTransientProviderOrCreate(target)
      : (this.providers.get(target) as IProvider<T> | undefined);

    return provider?.hasAccess({ invocationScope: child, providerScope: this, args })
      ? provider.resolve(this, { args, lazy })
      : this.parent.resolve<T>(target, { args, child, lazy });
  }

  /**
   * @throws {ContainerDisposedError} when the container has already been disposed.
   */
  construct<T>(Target: constructor<T>, options: ProviderOptions = {}): T {
    this.validateContainer();

    return this.injector.resolve(this, Target, options);
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

    const scope = new Container({ injector: this.injector, parent: this, tags })
      .onInstanceDisposed(...this.onDisposeHookList)
      .onScopeCreated(...this.onScopeCreatedHookList)
      .onProviderRegistered(...this.onProviderRegisteredHookList);

    for (const registration of this.getRegistrations()) {
      registration.applyTo(scope);
    }
    this.scopes.push(scope);

    // Hooks run once the scope is fully registered and attached, so they observe a usable scope.
    for (const onScopeCreated of this.onScopeCreatedHookList) {
      onScopeCreated(scope);
    }

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

    // Execute onDispose hooks
    for (const hook of this.onDisposeHookList) {
      hook(this);
    }

    // Detach from parent
    this.parent.removeScope(this);
    this.parent = new EmptyContainer();

    // Reset the state
    for (const provider of [...this.providers.values(), ...this.transientProviders.values()]) {
      provider.dispose();
    }
    this.providers.clear();
    this.transientProviders.clear();
    this.aliases.destroy();
    this.instances.clear();
    this.registrations = [];

    // Clear hooks
    this.onDisposeHookList.length = 0;
    this.onScopeCreatedHookList.length = 0;
    this.onProviderRegisteredHookList.length = 0;
  }

  addRegistration(registration: IRegistration): this {
    this.registrations.push(registration);
    registration.applyTo(this);
    return this;
  }

  getRegistrations(): IRegistration[] {
    return [...this.parent.getRegistrations(), ...this.registrations];
  }

  hasRegistration(key: DependencyKey): boolean {
    return this.registrations.some((r) => r.getKeyOrFail() === key) || this.parent.hasRegistration(key);
  }

  onInstanceDisposed(...hooks: OnDisposeHook[]): this {
    this.onDisposeHookList.push(...hooks);
    return this;
  }

  onScopeCreated(...hooks: ScopeHook[]): this {
    this.onScopeCreatedHookList.push(...hooks);
    return this;
  }

  onProviderRegistered(...hooks: ProviderHook[]): this {
    this.onProviderRegisteredHookList.push(...hooks);
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

  /**
   * The ad-hoc {@link TransientProvider} adapting a class to the provider
   * interface, so `resolve` has one path for a key and for a constructor.
   * Created on first use and kept for the life of this scope.
   *
   * The map is separate from `providers`, which keeps `resolve(Logger)` and
   * `resolve('Logger')` independent, and keyed by the constructor rather than
   * `Target.name`, so two same-named classes get a provider each.
   */
  private findTransientProviderOrCreate<T>(Target: constructor<T>): IProvider<T> {
    const existing = this.transientProviders.get(Target) as IProvider<T> | undefined;
    if (existing) {
      return existing;
    }

    const provider = new TransientProvider(Target);
    this.transientProviders.set(Target, provider);
    this.notifyProviderRegistered(provider);

    return provider;
  }

  private notifyProviderRegistered(provider: IProvider): void {
    for (const onProviderRegistered of this.onProviderRegisteredHookList) {
      onProviderRegistered(provider, this);
    }
  }
}
