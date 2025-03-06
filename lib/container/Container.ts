import {
  AliasPredicate,
  CreateScopeOptions,
  DependencyKey,
  IContainer,
  IContainerModule,
  InjectionToken,
  Instance,
  isConstructor,
  ResolveOptions,
  Tag,
} from './IContainer';
import { IInjector } from '../injector/IInjector';
import { IProvider } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { IRegistration } from '../registration/IRegistration';
import { ContainerDisposedError } from '../errors/ContainerDisposedError';

export class Container implements IContainer {
  isDisposed = false;
  private parent: IContainer;
  private readonly scopes = new Set<IContainer>();
  private readonly instances = new Set<Instance>();
  private readonly tags: Set<Tag>;
  private readonly providers = new Map<DependencyKey, IProvider>();
  private readonly registrations: Set<IRegistration> = new Set();
  private readonly onDispose: (instance: Instance) => void;

  constructor(
    private readonly injector: IInjector,
    options: { parent?: IContainer; tags?: Tag[]; onDispose?: (instance: Instance) => void } = {},
  ) {
    this.parent = options.parent ?? new EmptyContainer();
    this.tags = new Set(options.tags);
    this.onDispose = options.onDispose ?? (() => {});

    // apply registrations from parent
    for (const registration of this.parent.getRegistrations()) {
      registration.applyTo(this);
    }
  }

  add(registration: IRegistration): this {
    this.registrations.add(registration);
    registration.applyTo(this);
    return this;
  }

  register(key: DependencyKey, provider: IProvider): this {
    this.validateContainer();
    this.providers.set(key, provider);
    return this;
  }

  resolve<T>(token: InjectionToken<T>, { args = [], child = this, lazy }: ResolveOptions = {}): T {
    this.validateContainer();

    if (isConstructor(token)) {
      const instance = this.injector.resolve(this, token, { args });
      this.instances.add(instance as Instance);
      return instance;
    }

    const provider = this.providers.get(token) as IProvider<T> | undefined;
    return provider?.isVisible(this, child)
      ? provider.resolve(this, { args, lazy })
      : this.parent.resolve<T>(token, { args, child, lazy });
  }

  createScope({ tags = [] }: CreateScopeOptions = {}): IContainer {
    this.validateContainer();

    const scope = new Container(this.injector, { parent: this, tags, onDispose: this.onDispose });
    this.scopes.add(scope);

    return scope;
  }

  dispose(options: { cascade?: boolean } = {}): void {
    const { cascade = true } = options;
    this.validateContainer();
    this.isDisposed = true;

    // Dispose all scopes
    for (const scope of this.scopes) {
      if (cascade) {
        scope.dispose(options);
      } else {
        scope.detach();
      }
    }

    // Unbind from parent
    this.parent.removeScope(this);
    this.parent = new EmptyContainer();

    // Drop internal state to prevent memory leaks
    this.registrations.clear();
    this.providers.clear();
    this.instances.forEach((instance) => this.onDispose(instance));
    this.instances.clear();
  }

  detach(): void {
    this.parent.removeScope(this);
    this.parent = new EmptyContainer();
  }

  use(module: IContainerModule): this {
    module.applyTo(this);
    return this;
  }

  hasProvider(key: DependencyKey): boolean {
    return this.providers.has(key) ?? this.parent.hasProvider(key);
  }

  resolveManyByAlias(
    predicate: AliasPredicate,
    { args = [], child = this, lazy }: ResolveOptions = {},
    result: Map<DependencyKey, unknown> = new Map(),
  ): Map<DependencyKey, unknown> {
    for (const [key, provider] of this.providers.entries()) {
      if (!result.has(key) && provider.matchAliases(predicate) && provider.isVisible(this, child)) {
        result.set(key, provider.resolve(this, { args, lazy }));
      }
    }
    return this.parent.resolveManyByAlias(predicate, { args, child, lazy }, result);
  }

  resolveOneByAlias<T>(
    predicate: AliasPredicate,
    { args = [], child = this, lazy }: ResolveOptions = {},
  ): [DependencyKey, T] {
    for (const [key, provider] of this.providers.entries()) {
      if (provider.matchAliases(predicate) && provider.isVisible(this, child)) {
        return [key, provider.resolve(this, { args, lazy }) as T];
      }
    }
    return this.parent.resolveOneByAlias<T>(predicate, { args, child, lazy });
  }

  getParent() {
    return this.parent;
  }

  getScopes() {
    return [...this.scopes];
  }

  getInstances() {
    return [...this.instances];
  }

  hasTag(tag: Tag) {
    return this.tags.has(tag);
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
