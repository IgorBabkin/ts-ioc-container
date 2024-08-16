import {
  AliasPredicate,
  DependencyKey,
  IContainer,
  IContainerModule,
  InjectionToken,
  isConstructor,
  MatchTags,
  ResolveOptions,
  Tag,
  TagPath,
} from './IContainer';
import { IInjector } from '../injector/IInjector';
import { IProvider } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { ContainerDisposedError } from '../errors/ContainerDisposedError';
import { IRegistration } from '../registration/IRegistration';
import { Counter } from './Counter';

export class Container implements IContainer {
  isDisposed = false;
  private readonly providers = new Map<DependencyKey, IProvider>();
  readonly tags: Set<Tag>;
  private parent: IContainer;
  private scopes = new Set<IContainer>();
  private instances = new Set<object>();
  private readonly registrations: IRegistration[] = [];
  readonly id: string;
  readonly level: number;
  private readonly counter: Counter;

  constructor(
    private readonly injector: IInjector,
    {
      parent = new EmptyContainer(),
      tags = [],
      counter = new Counter(),
    }: { parent?: IContainer; tags?: Tag[]; counter?: Counter } = {},
  ) {
    this.parent = parent;
    this.tags = new Set(tags ?? []);
    this.counter = counter;
    this.id = counter.next();
    this.level = this.parent.level + 1;
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
      this.instances.add(instance as object);
      return instance;
    }

    const provider = this.providers.get(token) as IProvider<T> | undefined;
    return provider?.isVisible(this, child)
      ? provider.resolve(this, { args, lazy })
      : this.parent.resolve<T>(token, { args, child, lazy });
  }

  createScope(...tags: Tag[]): Container {
    this.validateContainer();

    const scope = new Container(this.injector, { parent: this, tags, counter: this.counter });
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

  getInstances(direction: 'parent' | 'child' = 'child'): object[] {
    switch (direction) {
      case 'parent': {
        return [...this.instances.values(), ...this.parent.getInstances('parent')];
      }
      case 'child': {
        const instances: object[] = [...this.instances.values()];
        for (const scope of this.scopes) {
          instances.push(...scope.getInstances('child'));
        }
        return instances;
      }
    }
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

  getPath(): TagPath {
    return [...this.parent.getPath(), Array.from(this.tags)];
  }

  findScopeByPath(tags: TagPath, matchTags: MatchTags): IContainer | undefined {
    const [currentTags, ...rest] = tags;

    if (!matchTags(this, currentTags)) {
      return undefined;
    }

    for (const scope of this.scopes) {
      const found = scope.findScopeByPath(rest, matchTags);
      if (found) {
        return found;
      }
    }

    if (rest.length === 0) {
      return this;
    }

    return undefined;
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

  hasInstance(value: object): boolean {
    return this.instances.has(value) || this.parent.hasInstance(value);
  }

  hasOwnInstance(value: object): boolean {
    return this.instances.has(value);
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
