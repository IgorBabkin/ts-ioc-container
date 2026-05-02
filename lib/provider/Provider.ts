import {
  ArgsFn,
  DecorateFn,
  GetCacheKey,
  IProvider,
  ProviderOptions,
  ResolveDependency,
  ScopeAccessOptions,
  ScopeAccessRule,
} from './IProvider';
import type { DependencyKey, IContainer } from '../container/IContainer';
import { type constructor } from '../utils/basic';
import { CannonSingletonApplyError } from '../errors/CannonSingletonApplyError';
import { ProviderDisposedError } from '../errors/ProviderDisposedError';

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
  private readonly mappers: DecorateFn<T>[] = [];
  private isLazy = false;
  private cache = new Map<string | symbol, unknown>();
  private getKey: GetCacheKey | undefined;
  private isDisposed: boolean = false;

  constructor(private readonly resolveDependency: ResolveDependency<T>) {}

  resolve(scope: IContainer, options: ProviderOptions): T {
    ProviderDisposedError.assert(this.isDisposed, 'Provider is already disposed');

    if (!this.getKey) {
      return this.resolveDep(scope, options);
    }

    const key = this.getKey(...(options.args ?? []));

    if (!this.cache.has(key)) {
      this.cache.set(key, this.resolveDep(scope, options));
    }

    return this.cache.get(key)! as T;
  }

  private resolveDep(scope: IContainer, { args = [], lazy }: ProviderOptions = {}): T {
    const dependency = this.resolveDependency(scope, {
      args: this.argsFnList.reduce((acc, current) => current(scope, { args: acc }), args),
      lazy: lazy ?? this.isLazy,
    });
    return this.mappers.reduce((acc, current) => current(acc, scope), dependency);
  }

  map(...mappers: DecorateFn<T>[]): this {
    this.mappers.push(...mappers);
    return this;
  }

  addAccessRule(...rules: ScopeAccessRule[]): this {
    this.accessRules.push(...rules);
    return this;
  }

  lazy(): this {
    this.isLazy = true;
    return this;
  }

  addArgsFn(...fns: ArgsFn[]): this {
    this.argsFnList.push(...fns);
    return this;
  }

  hasAccess(options: ScopeAccessOptions): boolean {
    ProviderDisposedError.assert(this.isDisposed, 'Provider is already disposed');

    return this.accessRules.reduce((acc, rule) => rule(options, acc), true);
  }

  singleton(getCacheKey: GetCacheKey = () => '1'): this {
    if (this.getKey) {
      throw new CannonSingletonApplyError('Provider is already singleton');
    }
    this.getKey = getCacheKey;
    return this;
  }

  dispose(): void {
    this.isDisposed = true;
    this.getKey = undefined;
    this.cache.clear();
    this.accessRules.splice(0, this.accessRules.length);
    this.mappers.splice(0, this.mappers.length);
    this.argsFnList.splice(0, this.argsFnList.length);
  }
}
