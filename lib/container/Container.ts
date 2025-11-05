import {
  type CreateScopeOptions,
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
import { type IProvider } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { type IRegistration } from '../registration/IRegistration';
import { ContainerDisposedError } from '../errors/ContainerDisposedError';
import { MetadataInjector } from '../injector/MetadataInjector';
import { type constructor, Filter as F, Is, toLazyIf } from '../utils';
import { AliasMap } from './AliasMap';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';
import { OnConstructHook } from '../hooks/onConstruct';
import { OnDisposeHook } from '../hooks/onDispose';

export class Container implements IContainer {
  isDisposed = false;
  private parent: IContainer;
  private readonly scopes = new Set<IContainer>();
  private readonly instances = new Set<Instance>();
  private readonly tags: Set<Tag>;
  private readonly providers = new Map<DependencyKey, IProvider>();
  private readonly aliases = new AliasMap();
  private readonly registrations = new Set<IRegistration>();
  private readonly injector: IInjector;
  private readonly onConstructHookList: OnConstructHook[] = [];
  private readonly onDisposeHookList: OnDisposeHook[] = [];

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

  addOnConstructHook(...hooks: OnConstructHook[]): this {
    this.onConstructHookList.push(...hooks);
    return this;
  }

  addOnDisposeHook(...hooks: OnDisposeHook[]): this {
    this.onDisposeHookList.push(...hooks);
    return this;
  }

  onInstanceCreated(instance: Instance) {
    this.instances.add(instance as Instance);

    // Execute onConstruct hooks
    for (const onConstruct of this.onConstructHookList) {
      onConstruct(instance as Instance, this);
    }
  }

  register(key: DependencyKey, provider: IProvider, { aliases = [] }: RegisterOptions = {}): this {
    this.validateContainer();
    this.providers.set(key, provider);
    this.aliases.deleteAliasesByKey(key);
    this.aliases.setAliases(key, aliases);
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

  resolve<T>(keyOrAlias: constructor<T> | DependencyKey, { args = [], child = this, lazy }: ResolveOneOptions = {}): T {
    this.validateContainer();

    if (Is.constructor(keyOrAlias)) {
      return toLazyIf(() => this.injector.resolve(this, keyOrAlias, { args }), lazy);
    }

    const provider = this.providers.get(keyOrAlias) as IProvider<T> | undefined;

    return provider?.hasAccess({ invocationScope: child, providerScope: this })
      ? provider.resolve(this, { args, lazy })
      : this.parent.resolve<T>(keyOrAlias, { args, child, lazy });
  }

  resolveByAlias<T>(
    alias: DependencyKey,
    { args = [], child = this, lazy, excludedKeys = [], takeFirst = -1 }: ResolveManyOptions = {},
  ): T[] {
    this.validateContainer();

    let left = takeFirst;
    const keys: DependencyKey[] = [];
    const deps: T[] = [];
    for (const key of this.aliases.findManyKeysByAlias(alias).filter(F.exclude(excludedKeys))) {
      const provider = this.findProviderByKeyOrFail<T>(key);
      if (!provider.hasAccess({ invocationScope: child, providerScope: this })) {
        continue;
      }
      keys.push(key);
      deps.push(provider.resolve(this, { args, lazy }));
      if (left < 0 || left > 0) {
        left--;
        continue;
      }
      break;
    }

    const parentDeps = this.parent.resolveByAlias<T>(alias, {
      args,
      child,
      lazy,
      excludedKeys: [...excludedKeys, ...keys],
    });
    return [...deps, ...parentDeps];
  }

  createScope({ tags = [] }: CreateScopeOptions = {}): IContainer {
    this.validateContainer();

    const scope = new Container({
      injector: this.injector,
      parent: this,
      tags,
    })
      .addOnConstructHook(...this.onConstructHookList)
      .addOnDisposeHook(...this.onDisposeHookList);

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

    // Clear hooks
    this.onConstructHookList.splice(0, this.onConstructHookList.length);

    // Execute onDispose hooks
    while (this.onDisposeHookList.length) {
      const onDispose = this.onDisposeHookList.shift()!;
      onDispose(this);
    }
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
