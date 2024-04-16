import {
  Alias,
  AliasPredicate,
  DependencyKey,
  IContainer,
  IContainerModule,
  InjectionToken,
  isConstructor,
  ResolveOptions,
  Tag,
} from './IContainer';
import { IInjector } from '../injector/IInjector';
import { IProvider } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { ContainerDisposedError } from '../errors/ContainerDisposedError';
import { IRegistration } from '../registration/IRegistration';

export class Container implements IContainer {
  isDisposed = false;
  private readonly providers = new Map<DependencyKey, IProvider>();
  private readonly aliases: Map<DependencyKey, Alias[]> = new Map();
  private tags: Set<Tag>;
  private parent: IContainer;
  private scopes = new Set<IContainer>();
  private instances = new Set<unknown>();
  private readonly registrations: IRegistration[] = [];

  constructor(
    private readonly injector: IInjector,
    options: { parent?: IContainer; tags?: Tag[] } = {},
  ) {
    this.parent = options.parent ?? new EmptyContainer();
    this.tags = new Set(options.tags ?? []);
  }

  addRegistration(registration: IRegistration): this {
    this.registrations.push(registration);
    registration.applyTo(this);
    return this;
  }

  register(key: DependencyKey, provider: IProvider, aliases?: Alias[]): this {
    this.validateContainer();

    this.providers.set(key, provider);
    if (aliases && aliases.length > 0) {
      this.aliases.set(key, aliases);
    }

    return this;
  }

  resolve<T>(token: InjectionToken<T>, { args = [], child = this }: ResolveOptions = {}): T {
    this.validateContainer();

    if (isConstructor(token)) {
      const instance = this.injector.resolve(this, token, ...args);
      this.instances.add(instance);
      return instance;
    }

    const provider = this.providers.get(token) as IProvider<T> | undefined;
    return provider?.isVisible(this, child)
      ? provider.resolve(this, ...args)
      : this.parent.resolve<T>(token, { args, child });
  }

  createScope(...tags: Tag[]): Container {
    this.validateContainer();

    const scope = new Container(this.injector, { parent: this, tags });
    scope.applyRegistrationsFrom(this);
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
    this.registrations.splice(0, this.registrations.length);
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
  applyRegistrationsFrom(source: IContainer): void {
    for (const registration of source.getRegistrations()) {
      registration.applyTo(this);
    }
  }

  /**
   * @private
   */
  getRegistrations(): IRegistration[] {
    return this.registrations.length
      ? this.parent.getRegistrations().concat(this.registrations)
      : this.parent.getRegistrations();
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
