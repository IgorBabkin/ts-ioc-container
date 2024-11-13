import {
  AliasPredicate,
  CreateScopeOptions,
  DependencyKey,
  IContainer,
  IContainerModule,
  InjectionToken,
  Instance,
  isConstructor,
  ReduceScope,
  ResolveOptions,
  Tag,
} from './IContainer';
import { IInjector } from '../injector/IInjector';
import { IProvider } from '../provider/IProvider';
import { EmptyContainer } from './EmptyContainer';
import { IRegistration } from '../registration/IRegistration';
import { Counter } from './Counter';
import { TypedEvent } from '../TypedEvent';
import { ContainerDisposedError } from '../errors/ContainerDisposedError';

export class Container implements IContainer {
  isDisposed = false;
  readonly id: string;
  readonly tags: Set<Tag>;
  readonly level: number;
  private parent: IContainer;

  private readonly providers = new Map<DependencyKey, IProvider>();
  private readonly scopes = new Set<IContainer>();
  private readonly instances = new Set<Instance>();
  private readonly registrations: IRegistration[] = [];
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

  get onConstruct(): TypedEvent<Instance> {
    return this.parent.onConstruct;
  }

  get onDispose(): TypedEvent<IContainer> {
    return this.parent.onDispose;
  }

  get onScopeCreated(): TypedEvent<IContainer> {
    return this.parent.onScopeCreated;
  }

  get onScopeRemoved(): TypedEvent<IContainer> {
    return this.parent.onScopeRemoved;
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
      this.instances.add(instance as Instance);
      this.onConstruct.emit(instance as Instance);
      return instance;
    }

    const provider = this.providers.get(token) as IProvider<T> | undefined;
    return provider?.isVisible(this, child)
      ? provider.resolve(this, { args, lazy })
      : this.parent.resolve<T>(token, { args, child, lazy });
  }

  matchTags(tags: Tag[]): boolean {
    return this.tags.size === tags.length && tags.every((tag) => this.tags.has(tag));
  }

  createScope({ tags = [], idempotent }: CreateScopeOptions = {}): IContainer {
    this.validateContainer();

    if (idempotent) {
      for (const scope of this.scopes) {
        if (scope.matchTags(tags)) {
          return scope;
        }
      }
    }

    const scope = new Container(this.injector, { parent: this, tags, counter: this.counter });
    scope.applyRegistrationsFrom(this);
    this.scopes.add(scope);
    this.onScopeCreated.emit(scope);

    return scope;
  }

  dispose(): void {
    this.validateContainer();
    this.onDispose.emit(this);
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
    if (direction === 'parent') {
      return [...this.parent.getInstances('parent'), ...this.instances];
    }

    const instances: object[] = Array.from(this.instances);
    for (const scope of this.scopes) {
      instances.push(...scope.getInstances('child'));
    }
    return instances;
  }

  getOwnInstances(): object[] {
    return Array.from(this.instances);
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

  reduceToRoot<TResult>(fn: ReduceScope<TResult>, initial: TResult): TResult {
    return fn(this.parent.reduceToRoot(fn, initial), this);
  }

  findChild(matchFn: (s: IContainer) => boolean): IContainer | undefined {
    if (matchFn(this)) {
      return this;
    }

    for (const scope of this.scopes) {
      const child = scope.findChild(matchFn);
      if (child) {
        return child;
      }
    }
    return undefined;
  }

  findParent(matchFn: (s: IContainer) => boolean): IContainer | undefined {
    return matchFn(this) ? this : this.parent.findParent(matchFn);
  }

  hasInstance(value: Instance, direction: 'parent' | 'child'): boolean {
    if (direction === 'parent') {
      return this.instances.has(value) || this.parent.hasInstance(value, 'parent');
    }

    return this.instances.has(value) || Array.from(this.scopes).some((scope) => scope.hasInstance(value, 'child'));
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
    return [...this.parent.getRegistrations(), ...this.registrations];
  }

  /**
   * @private
   */
  removeScope(child: IContainer): void {
    this.scopes.delete(child);
    this.onScopeRemoved.emit(child);
  }

  private validateContainer(): void {
    ContainerDisposedError.assert(!this.isDisposed, 'Container is already disposed');
  }
}
