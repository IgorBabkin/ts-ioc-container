// biome-ignore lint/style/useImportType: <explanation>
import {
  type ContainerResolver,
  type CreateScopeOptions,
  type DependencyKey,
  type IContainer,
  type IContainerModule,
  type Instance,
  type RegisterOptions,
  type ResolveOneOptions,
  type Tag,
} from './IContainer';
import { type IInjector } from '../injector/IInjector';
import { type IProvider } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { type IRegistration } from '../registration/IRegistration';
import { ContainerDisposedError } from '../errors/ContainerDisposedError';
import { MetadataInjector } from '../injector/MetadataInjector';
import { type constructor, isConstructor } from '../utils';
import { ProviderMap } from './ProviderMap';
import { AliasMap } from './AliasMap';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';

export const DEFAULT_CONTAINER_RESOLVER = <T>(
  scope: IContainer,
  keyOrAlias: constructor<T> | DependencyKey,
  options?: ResolveOneOptions,
): T => {
  if (isConstructor(keyOrAlias)) {
    return scope.resolveByClass(keyOrAlias, options);
  }

  try {
    return scope.resolveOneByKey(keyOrAlias, options);
  } catch (e) {
    if (e instanceof DependencyNotFoundError) {
      return scope.resolveOneByAlias(keyOrAlias, options);
    }

    throw e;
  }
};

export class Container implements IContainer {
  isDisposed = false;
  private parent: IContainer;
  private readonly scopes = new Set<IContainer>();
  private readonly instances = new Set<Instance>();
  private readonly tags: Set<Tag>;
  private readonly providerMap = new ProviderMap();
  private readonly aliasMap = new AliasMap();
  private readonly registrations = new Set<IRegistration>();
  private readonly onConstruct: (instance: Instance, scope: IContainer) => void;
  private readonly onDispose: (scope: IContainer) => void;
  private readonly onResolve: ContainerResolver = DEFAULT_CONTAINER_RESOLVER;
  private readonly injector: IInjector;

  constructor(
    options: {
      injector?: IInjector;
      parent?: IContainer;
      tags?: Tag[];
      onConstruct?: (instance: Instance, scope: IContainer) => void;
      onDispose?: (scope: IContainer) => void;
      onResolve?: ContainerResolver;
    } = {},
  ) {
    this.injector = options.injector ?? new MetadataInjector();
    this.parent = options.parent ?? new EmptyContainer();
    this.tags = new Set(options.tags ?? []);
    this.onConstruct = options.onConstruct ?? (() => {});
    this.onDispose = options.onDispose ?? (() => {});
    this.onResolve = options.onResolve ?? DEFAULT_CONTAINER_RESOLVER;
  }

  addRegistration(registration: IRegistration): this {
    this.registrations.add(registration);
    registration.applyTo(this);
    return this;
  }

  register(key: DependencyKey, provider: IProvider, { aliases = [] }: RegisterOptions = {}): this {
    this.validateContainer();
    this.providerMap.register(key, provider);
    this.aliasMap.deleteKeyFromAliases(key);
    this.aliasMap.addAliases(key, aliases);
    return this;
  }

  resolve<T>(keyOrAlias: constructor<T> | DependencyKey, options?: ResolveOneOptions): T {
    return this.onResolve(this, keyOrAlias, options);
  }

  resolveMany<T>(
    alias: DependencyKey,
    { args = [], child = this, lazy, excluded = [] }: ResolveOneOptions & { excluded?: DependencyKey[] } = {},
  ): T[] {
    this.validateContainer();

    const providersKeys = this.aliasMap.findManyKeysByAlias(alias, new Set(excluded));

    const key2VisibleProvider = providersKeys
      .map<[DependencyKey, IProvider<T>]>((k) => [k, this.providerMap.findOneByKeyOrFail(k)])
      .filter(([k, provider]) => provider.isVisible(this, child));

    const key2Dependency = new Map<DependencyKey, T>(
      key2VisibleProvider.map(([k, provider]) => [k, provider.resolve(this, { args, lazy })]),
    );

    const parentDeps = this.parent.resolveMany<T>(alias, {
      args,
      child,
      lazy,
      excludedKeys: [...excluded, ...key2Dependency.keys()],
    });
    return [...key2Dependency.values(), ...parentDeps];
  }

  resolveByClass<T>(token: constructor<T>, { args = [] }: { args?: unknown[] } = {}): T {
    this.validateContainer();

    const instance = this.injector.resolve(this, token, { args });
    this.instances.add(instance as Instance);
    this.onConstruct(instance as Instance, this);
    return instance;
  }

  resolveOneByKey<T>(keyOrAlias: DependencyKey, { args = [], child = this, lazy }: ResolveOneOptions = {}): T {
    this.validateContainer();

    const provider = this.providerMap.findOneByKey<T>(keyOrAlias);

    return provider?.isVisible(this, child)
      ? provider.resolve(this, { args, lazy })
      : this.parent.resolveOneByKey<T>(keyOrAlias, { args, child, lazy });
  }

  resolveOneByAlias<T>(keyOrAlias: DependencyKey, { args = [], child = this, lazy }: ResolveOneOptions = {}): T {
    this.validateContainer();

    const key = this.aliasMap.findLastKeyByAlias(keyOrAlias);
    const provider = key !== undefined ? this.providerMap.findOneByKeyOrFail<T>(key) : undefined;

    return provider?.isVisible(this, child)
      ? provider.resolve(this, { args, lazy })
      : this.parent.resolveOneByAlias<T>(keyOrAlias, { args, child, lazy });
  }

  createScope({ tags = [] }: CreateScopeOptions = {}): IContainer {
    this.validateContainer();

    const scope = new Container({
      injector: this.injector,
      parent: this,
      tags,
      onDispose: this.onDispose,
      onResolve: this.onResolve,
      onConstruct: this.onConstruct,
    });
    scope.applyRegistrationsFrom(this);
    this.scopes.add(scope);

    return scope;
  }

  dispose({ cascade = true }: { cascade?: boolean } = {}): void {
    this.validateContainer();
    this.isDisposed = true;

    // Detach from parent
    this.parent.removeScope(this);
    this.parent = new EmptyContainer();

    // Reset the state
    this.providerMap.destroy();
    this.aliasMap.destroy();
    this.instances.clear();
    this.registrations.clear();
    this.onDispose(this);

    // Dispose all scopes
    while (this.scopes.size > 0) {
      const scope = this.scopes.values().next().value!;
      if (cascade) {
        scope.dispose({ cascade: true });
      } else {
        scope.detachFromParent();
      }
    }
  }

  detachFromParent() {
    this.parent.removeScope(this);
    this.parent = new EmptyContainer();
  }

  useModule(module: IContainerModule): this {
    module.applyTo(this);
    return this;
  }

  hasProvider(keyOrAlias: DependencyKey): boolean {
    return this.providerMap.has(keyOrAlias) || this.aliasMap.has(keyOrAlias) || this.parent.hasProvider(keyOrAlias);
  }

  getParent() {
    return this.parent;
  }

  getScopes() {
    return [...this.scopes];
  }

  getInstances({ cascade = true }: { cascade?: boolean } = {}) {
    return cascade
      ? [...this.instances, ...[...this.scopes].flatMap((s) => s.getInstances({ cascade }))]
      : [...this.instances];
  }

  hasTag(tag: Tag) {
    return this.tags.has(tag);
  }

  /**
   * @private
   */
  applyRegistrationsFrom(source: Container): void {
    for (const registration of source.getRegistrations()) {
      registration.applyTo(this);
    }
  }

  /**
   * @private
   */
  getRegistrations(): IRegistration[] {
    return [...this.parent.getRegistrations(), ...this.registrations];
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
