import {
  ArgsFn,
  IProvider,
  ProviderOptions,
  ResolveDependency,
  ScopeAccessOptions,
  ScopeAccessRule,
} from './IProvider';
import type { DependencyKey, IContainer } from '../container/IContainer';
import { type MapFn, pipe } from '../utils/fp';
import type { ProviderPipe } from './ProviderPipe';
import { isProviderPipe } from './ProviderPipe';
import { type constructor } from '../utils/basic';

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

  private argsFn: ArgsFn = (s, { args = [] } = {}) => args;
  private readonly accessRules: ScopeAccessRule[] = [];
  private isLazy = false;

  constructor(private readonly resolveDependency: ResolveDependency<T>) {}

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderPipe<T>)[]): IProvider<T> {
    const fns = mappers.map((m): MapFn<IProvider<T>> => (isProviderPipe<T>(m) ? m.mapProvider.bind(m) : m));
    return pipe(...fns)(this);
  }

  resolve(container: IContainer, { args = [], lazy }: ProviderOptions = {}): T {
    return this.resolveDependency(container, {
      args: this.argsFn(container, { args }),
      lazy: lazy ?? this.isLazy,
    });
  }

  addAccessRule(...rules: ScopeAccessRule[]): this {
    this.accessRules.push(...rules);
    return this;
  }

  lazy(): this {
    this.isLazy = true;
    return this;
  }

  addArgs(...extraArgs: unknown[]): this {
    const parentFn = this.argsFn;
    this.argsFn = (container, options) => [...parentFn(container, options), ...extraArgs];
    return this;
  }

  addArgsFn(argsFn: ArgsFn): this {
    const parentFn = this.argsFn;
    this.argsFn = (container, options) => [...parentFn(container, options), ...argsFn(container, options)];
    return this;
  }

  hasAccess(options: ScopeAccessOptions): boolean {
    return this.accessRules.reduce((acc, rule) => rule(options, acc), true);
  }
}
