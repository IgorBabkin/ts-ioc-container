import {
  type CreateScopeOptions,
  DEFAULT_CONTAINER_RESOLVER,
  type DependencyKey,
  type IContainer,
  type IContainerModule,
  type Instance,
  type RegisterOptions,
  ResolveManyOptions,
  type ResolveOneOptions,
  type Tag,
} from './IContainer';
import { type IInjector } from '../injector/IInjector';
import { type IProvider, ProviderOptions } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { type IRegistration } from '../registration/IRegistration';
import { ContainerDisposedError } from '../errors/ContainerDisposedError';
import { MetadataInjector } from '../injector/MetadataInjector';
import { type constructor, Filter as F, toLazyIf } from '../utils';
import { AliasMap } from './AliasMap';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';

type ResolveOneStrategy = <T>(
  scope: IContainer,
  keyOrAlias: constructor<T> | DependencyKey,
  options?: ResolveOneOptions,
) => T;

export class Container implements IContainer {
  isDisposed = false;
  private parent: IContainer;
  private readonly scopes = new Set<IContainer>();
  private readonly instances = new Set<Instance>();
  private readonly tags: Set<Tag>;
  private readonly providers = new Map<DependencyKey, IProvider>();
  private readonly aliases = new AliasMap();
  private readonly registrations = new Set<IRegistration>();
  private readonly onConstruct: (instance: Instance, scope: IContainer) => void;
  private readonly onDispose: (scope: IContainer) => void;
  private readonly injector: IInjector;
  private readonly resolveOneStrategy: ResolveOneStrategy;

  constructor(
    options: {
      injector?: IInjector;
      parent?: IContainer;
      tags?: Tag[];
      onConstruct?: (instance: Instance, scope: IContainer) => void;
      onDispose?: (scope: IContainer) => void;
      resolveOneStrategy?: ResolveOneStrategy;
    } = {},
  ) {
    this.injector = options.injector ?? new MetadataInjector();
    this.parent = options.parent ?? new EmptyContainer();
    this.tags = new Set(options.tags ?? []);
    this.onConstruct = options.onConstruct ?? (() => {});
    this.onDispose = options.onDispose ?? (() => {});
    this.resolveOneStrategy = options.resolveOneStrategy ?? DEFAULT_CONTAINER_RESOLVER;
  }

  register(key: DependencyKey, provider: IProvider, { aliases = [] }: RegisterOptions = {}): this {
    this.validateContainer();
    this.providers.set(key, provider);
    this.aliases.deleteKeyFromAliases(key);
    this.aliases.addAliases(key, aliases);
    return this;
  }

  addRegistration(registration: IRegistration): this {
    this.registrations.add(registration);
    registration.applyTo(this);
    return this;
  }

  getRegistrations(): IRegistration[] {
    return [...this.parent.getRegistrations(), ...this.registrations];
  }

  resolveClass<T>(token: constructor<T>, options?: ProviderOptions): T {
    this.validateContainer();

    return toLazyIf(() => {
      const instance = this.injector.resolve(this, token, options);
      this.instances.add(instance as Instance);
      this.onConstruct(instance as Instance, this);
      return instance;
    }, options?.lazy);
  }

  resolveOne<T>(keyOrAlias: constructor<T> | DependencyKey, options?: ResolveOneOptions): T {
    return this.resolveOneStrategy(this, keyOrAlias, options);
  }

  resolveOneByKey<T>(keyOrAlias: DependencyKey, { args = [], child = this, lazy }: ResolveOneOptions = {}): T {
    this.validateContainer();

    const provider = this.providers.get(keyOrAlias) as IProvider<T> | undefined;

    return provider?.hasAccess({ invocationScope: child, providerScope: this })
      ? provider.resolve(this, { args, lazy })
      : this.parent.resolveOneByKey<T>(keyOrAlias, { args, child, lazy });
  }

  resolveOneByAlias<T>(keyOrAlias: DependencyKey, { args = [], child = this, lazy }: ResolveOneOptions = {}): T {
    this.validateContainer();

    const key = this.aliases.findLastKeyByAlias(keyOrAlias);
    const provider = key !== undefined ? this.findProviderByKeyOrFail<T>(key) : undefined;

    return provider?.hasAccess({ invocationScope: child, providerScope: this })
      ? provider.resolve(this, { args, lazy })
      : this.parent.resolveOneByAlias<T>(keyOrAlias, { args, child, lazy });
  }

  resolveMany<T>(
    alias: DependencyKey,
    { args = [], child = this, lazy, excludedKeys = new Set() }: ResolveManyOptions = {},
  ): T[] {
    this.validateContainer();

    const keys: DependencyKey[] = [];
    const deps: T[] = [];
    for (const key of this.aliases.findManyKeysByAlias(alias).filter(F.exclude(excludedKeys))) {
      const provider = this.findProviderByKeyOrFail<T>(key);
      if (!provider.hasAccess({ invocationScope: child, providerScope: this })) {
        continue;
      }
      keys.push(key);
      deps.push(provider.resolve(this, { args, lazy }));
    }

    const parentDeps = this.parent.resolveMany<T>(alias, {
      args,
      child,
      lazy,
      excludedKeys: new Set([...excludedKeys, ...keys]),
    });
    return [...deps, ...parentDeps];
  }

  createScope({ tags = [] }: CreateScopeOptions = {}): IContainer {
    this.validateContainer();

    const scope = new Container({
      injector: this.injector,
      parent: this,
      tags,
      onDispose: this.onDispose,
      onConstruct: this.onConstruct,
    });
    scope.applyRegistrationsFrom(this);
    this.scopes.add(scope);

    return scope;
  }

  getScopes() {
    return [...this.scopes];
  }

  removeScope(child: IContainer): void {
    this.scopes.delete(child);
  }

  useModule(module: IContainerModule): this {
    module.applyTo(this);
    return this;
  }

  getParent() {
    return this.parent;
  }

  getInstances() {
    return [...this.instances];
  }

  hasTag(tag: Tag) {
    return this.tags.has(tag);
  }

  dispose(): void {
    this.validateContainer();
    this.isDisposed = true;

    // Detach from parent
    this.parent.removeScope(this);
    this.parent = new EmptyContainer();

    // Reset the state
    this.providers.clear();
    this.aliases.destroy();
    this.instances.clear();
    this.registrations.clear();
    this.onDispose(this);
  }

  /**
   * @private
   */
  applyRegistrationsFrom(source: Container): void {
    for (const registration of source.getRegistrations()) {
      registration.applyTo(this);
    }
  }

  private validateContainer(): void {
    if (this.isDisposed) {
      throw new ContainerDisposedError('Container is already disposed');
    }
  }

  private findProviderByKeyOrFail<T>(key: DependencyKey): IProvider<T> {
    if (!this.providers.has(key)) {
      throw new DependencyNotFoundError(`Provider ${key.toString()} does not exist`);
    }
    return this.providers.get(key)!;
  }
}
