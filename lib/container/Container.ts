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
  private readonly scopes: IContainer[] = [];
  private readonly instances: Instance[] = [];
  private readonly tags: Set<Tag>;
  private readonly providers = new Map<DependencyKey, IProvider>();
  private readonly registrations: IRegistration[] = [];
  private readonly onConstruct: (instance: Instance, scope: IContainer) => void;
  private readonly onDispose: (scope: IContainer) => void;

  constructor(
    private readonly injector: IInjector,
    options: {
      parent?: IContainer;
      tags?: Tag[];
      onConstruct?: (instance: Instance, scope: IContainer) => void;
      onDispose?: (scope: IContainer) => void;
    } = {},
  ) {
    this.parent = options.parent ?? new EmptyContainer();
    this.tags = new Set(options.tags ?? []);
    this.onConstruct = options.onConstruct ?? (() => {});
    this.onDispose = options.onDispose ?? (() => {});
  }

  add(registration: IRegistration): this {
    this.registrations.push(registration);
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
      this.instances.push(instance as Instance);
      this.onConstruct(instance as Instance, this);
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
    scope.applyRegistrationsFrom(this);
    this.scopes.push(scope);

    return scope;
  }

  dispose({ cascade = true }: { cascade?: boolean } = {}): void {
    this.validateContainer();
    this.isDisposed = true;

    // Detach from parent
    this.parent.removeScope(this);
    this.parent = new EmptyContainer();

    // Reset the state
    this.providers.clear();
    this.instances.splice(0, this.instances.length);
    this.registrations.splice(0, this.registrations.length);
    this.onDispose(this);

    // Dispose all scopes
    while (this.scopes.length > 0) {
      const scope = this.scopes[0];
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
    const index = this.scopes.indexOf(child);
    this.scopes.splice(index, 1);
  }

  private validateContainer(): void {
    ContainerDisposedError.assert(!this.isDisposed, 'Container is already disposed');
  }
}
