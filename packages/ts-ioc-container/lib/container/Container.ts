import {
  AliasPredicate,
  DependencyKey,
  IContainer,
  IContainerModule,
  InjectionToken,
  isConstructor,
  ResolveOptions,
  Tag,
} from './IContainer';
import { IInjector, InjectOptions } from '../injector/IInjector';
import { IProvider } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { ContainerDisposedError } from '../errors/ContainerDisposedError';
import { IRegistration } from '../registration/IRegistration';
import { constructor, lazyInstance } from '../utils';

export class Container implements IContainer {
  isDisposed = false;
  private readonly providers = new Map<DependencyKey, IProvider>();
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
      return lazy
        ? lazyInstance(() => this.resolveByInjector(token, { args }))
        : this.resolveByInjector(token, { args });
    }

    const provider = this.providers.get(token) as IProvider<T> | undefined;
    return provider?.isVisible(this, child)
      ? provider.resolve(this, { args, lazy })
      : this.parent.resolve<T>(token, { args, child, lazy });
  }

  private resolveByInjector<T>(token: constructor<T>, options: InjectOptions): T {
    const instance = this.injector.resolve(this, token, options);
    this.instances.add(instance);
    return instance;
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

  use(module: IContainerModule): this {
    module.applyTo(this);
    return this;
  }

  hasDependency(key: DependencyKey): boolean {
    return this.providers.has(key) ?? this.parent.hasDependency(key);
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
    const registrations = this.parent.getRegistrations();
    return this.registrations.length > 0 ? registrations.concat(this.registrations) : registrations;
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
