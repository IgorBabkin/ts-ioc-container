import {
  type ArgsFn,
  type DecorateFn,
  type GetCacheKey,
  type IProvider,
  type ProviderOptions,
  type ResolveDependency,
  type ScopeAccessOptions,
  type ScopeAccessRule,
  type ProviderHook,
} from './IProvider';
import type { DependencyKey, IContainer } from '../container/IContainer';
import { type constructor } from '../utils/basic';
import { CannonSingletonApplyTwiceError } from '../errors/CannonSingletonApplyTwiceError';
import { ProviderDisposedError } from '../errors/ProviderDisposedError';
import { matchNamespace, type Namespace, type NamespaceTemplate } from '../utils/namespace';

export class Provider<T = any> implements IProvider<T> {
  static fromClass<T>(Target: constructor<T>): IProvider<T> {
    return new Provider((container, options) => container.resolve(Target, options));
  }

  static fromValue<T>(value: T): IProvider<T> {
    return new Provider(() => value);
  }

  static fromKey<T>(key: DependencyKey) {
    return new Provider<T>((c) => c.resolve(key));
  }

  private readonly argsFnList: ArgsFn[] = [];
  private readonly accessRules: ScopeAccessRule[] = [];
  private readonly namespaceTemplates: NamespaceTemplate[] = [];
  private readonly mappers: DecorateFn<T>[] = [];
  private isLazy = false;
  private isAutoResolve = false;
  private cache = new Map<string | symbol, unknown>();
  private getKey: GetCacheKey | undefined;
  private isDisposed: boolean = false;
  private readonly onResolvedHookList: ProviderHook[] = [];

  constructor(private readonly resolveDependency: ResolveDependency<T>) {}

  /**
   * @throws {ProviderDisposedError} when the provider has already been disposed.
   * @throws {unknown} rethrows whatever an `onResolved` hook threw.
   */
  resolve(scope: IContainer, options: ProviderOptions): T {
    ProviderDisposedError.assert(!this.isDisposed, 'Provider is already disposed');

    if (!this.getKey) {
      return this.resolveDep(scope, options);
    }

    const key = this.getKey(...(options.args ?? []));

    if (!this.cache.has(key)) {
      this.cache.set(key, this.resolveDep(scope, options));
    }

    return this.cache.get(key)! as T;
  }

  /**
   * @throws {unknown} rethrows whatever an `onResolved` hook threw.
   */
  private resolveDep(scope: IContainer, { args = [], lazy, namespace }: ProviderOptions = {}): T {
    let dependency = this.resolveDependency(scope, {
      args: this.argsFnList.reduce((acc, current) => current(scope, { args: acc }), args),
      lazy: lazy ?? this.isLazy,
      // Still the same resolution, so a class provider constructs its target under the caller's namespace.
      namespace,
    });
    dependency = this.mappers.reduce((acc, current) => current(acc, scope), dependency);
    for (const onResolved of this.onResolvedHookList) {
      onResolved(dependency, scope);
    }
    return dependency;
  }

  map(...mappers: DecorateFn<T>[]): this {
    this.mappers.push(...mappers);
    return this;
  }

  addAccessRule(...rules: ScopeAccessRule[]): this {
    this.accessRules.push(...rules);
    return this;
  }

  /**
   * Restricts the provider to resolutions coming from a matching namespace.
   *
   * Templates accumulate as alternatives: a provider with several of them is
   * reachable from any namespace matching at least one. A provider with none is
   * reachable from everywhere, which is how every provider behaves by default.
   */
  addNamespaceTemplate(template: NamespaceTemplate): this {
    this.namespaceTemplates.push(template);
    return this;
  }

  lazy(): this {
    this.isLazy = true;
    return this;
  }

  autoResolve(): this {
    this.isAutoResolve = true;
    return this;
  }

  /**
   * @throws {ProviderDisposedError} when the provider has already been disposed.
   */
  isAutoResolvable(): boolean {
    ProviderDisposedError.assert(!this.isDisposed, 'Provider is already disposed');

    return this.isAutoResolve;
  }

  addArgsFn(...fns: ArgsFn[]): this {
    this.argsFnList.push(...fns);
    return this;
  }

  /**
   * @throws {ProviderDisposedError} when the provider has already been disposed.
   */
  hasAccess(options: ScopeAccessOptions): boolean {
    ProviderDisposedError.assert(!this.isDisposed, 'Provider is already disposed');

    return (
      this.hasNamespaceAccess(options.namespace) && this.accessRules.reduce((acc, rule) => rule(options, acc), true)
    );
  }

  /**
   * A restricted provider denies a resolution which names no namespace at all -
   * only a caller which says where it resolves from can be let through.
   */
  private hasNamespaceAccess(namespace: Namespace | undefined): boolean {
    if (this.namespaceTemplates.length === 0) {
      return true;
    }

    return namespace !== undefined && this.namespaceTemplates.some((template) => matchNamespace(template, namespace));
  }

  /**
   * @throws {CannonSingletonApplyTwiceError} when the provider is already configured as a singleton.
   */
  singleton(getCacheKey: GetCacheKey = () => '1'): this {
    CannonSingletonApplyTwiceError.assert(!this.getKey, 'Provider is already singleton');
    this.getKey = getCacheKey;
    return this;
  }

  /**
   * Hooks run after every mapper, on each resolved dependency. A singleton provider
   * caches the dependency, so its hooks run once — on the resolve that filled the cache.
   */
  onResolved(...hooks: ProviderHook[]): this {
    this.onResolvedHookList.push(...hooks);
    return this;
  }

  /**
   * @throws {ProviderDisposedError} when the provider has already been disposed.
   */
  dispose(): void {
    ProviderDisposedError.assert(!this.isDisposed, 'Provider is already disposed');
    this.isDisposed = true;
    this.isAutoResolve = false;
    this.getKey = undefined;
    this.cache.clear();
    this.accessRules.splice(0, this.accessRules.length);
    this.namespaceTemplates.splice(0, this.namespaceTemplates.length);
    this.mappers.splice(0, this.mappers.length);
    this.argsFnList.splice(0, this.argsFnList.length);
    this.onResolvedHookList.splice(0, this.onResolvedHookList.length);
  }
}
