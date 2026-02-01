import {
  type CreateScopeOptions,
  type DependencyKey,
  type IContainer,
  type IContainerModule,
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
import { AliasMap } from './AliasMap';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';
import { OnConstructHook } from '../hooks/onConstruct';
import { OnDisposeHook } from '../hooks/onDispose';
import { constructor, Instance, Is } from '../utils/basic';
import { Filter as F } from '../utils/array';

export class Container implements IContainer {
  isDisposed = false;
  private parent: IContainer;
  private scopes: IContainer[] = [];
  private instances: Instance[] = [];
  private registrations: IRegistration[] = [];
  private readonly tags: Set<Tag>;
  private readonly providers = new Map<DependencyKey, IProvider>();
  private readonly aliases = new AliasMap();
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

  register(key: DependencyKey, provider: IProvider, { aliases = [] }: RegisterOptions = {}): this {
    this.validateContainer();
    this.providers.set(key, provider);
    this.aliases.setAliasesByKey(key, aliases);
    return this;
  }

  resolve<T>(target: constructor<T> | DependencyKey, { args, child = this, lazy }: ResolveOneOptions = {}): T {
    this.validateContainer();

    if (Is.constructor(target)) {
      return this.injector.resolve(this, target, { args, lazy });
    }

    const provider = this.providers.get(target) as IProvider<T> | undefined;

    return provider?.hasAccess({ invocationScope: child, providerScope: this })
      ? provider.resolve(this, { args, lazy })
      : this.parent.resolve<T>(target, { args, child, lazy });
  }

  resolveByAlias<T>(
    alias: DependencyKey,
    { args, child = this, lazy, excludedKeys = [] }: ResolveManyOptions = {},
  ): T[] {
    this.validateContainer();

    const keys: DependencyKey[] = [];
    const deps: T[] = [];
    for (const key of this.aliases.getKeysByAlias(alias).filter(F.exclude(excludedKeys))) {
      const provider = this.findProviderByKeyOrFail<T>(key);
      if (!provider.hasAccess({ invocationScope: child, providerScope: this })) {
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

  resolveOneByAlias<T>(alias: DependencyKey, { args, child = this, lazy }: ResolveOneOptions = {}): T {
    this.validateContainer();

    const [key, ..._] = this.aliases.getKeysByAlias(alias);
    const provider = key ? this.findProviderByKeyOrFail<T>(key) : undefined;

    return provider?.hasAccess({ invocationScope: child, providerScope: this })
      ? provider.resolve(this, { args, lazy })
      : this.parent.resolveOneByAlias<T>(key, { args, child, lazy });
  }

  createScope({ tags }: CreateScopeOptions = {}): IContainer {
    this.validateContainer();

    const scope = new Container({ injector: this.injector, parent: this, tags })
      .addOnConstructHook(...this.onConstructHookList)
      .addOnDisposeHook(...this.onDisposeHookList);

    for (const registration of [...this.parent.getRegistrations(), ...this.registrations]) {
      registration.applyTo(scope);
    }
    this.scopes.push(scope);

    return scope;
  }

  dispose(): void {
    this.validateContainer();
    this.isDisposed = true;

    // Execute onDispose hooks
    while (this.onDisposeHookList.length) {
      const onDispose = this.onDisposeHookList.shift()!;
      onDispose(this);
    }

    // Detach from parent
    this.parent.removeScope(this);
    this.parent = new EmptyContainer();

    // Reset the state
    this.providers.clear();
    this.aliases.destroy();
    this.instances = [];
    this.registrations = [];

    // Clear hooks
    this.onConstructHookList.splice(0, this.onConstructHookList.length);
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

  addOnConstructHook(...hooks: OnConstructHook[]): this {
    this.onConstructHookList.push(...hooks);
    return this;
  }

  addOnDisposeHook(...hooks: OnDisposeHook[]): this {
    this.onDisposeHookList.push(...hooks);
    return this;
  }

  addInstance(instance: Instance) {
    this.instances.push(instance as Instance);

    // Execute onConstruct hooks
    for (const onConstruct of this.onConstructHookList) {
      onConstruct(instance, this);
    }
  }

  getScopes() {
    return [...this.scopes];
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
