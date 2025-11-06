import type { DependencyKey, IContainer } from '../container/IContainer';
import { constructor, Is, MapFn, pipe } from '../utils';
import { Provider } from '../provider/Provider';
import type { IProvider, ResolveDependency } from '../provider/IProvider';
import { DependencyMissingKeyError } from '../errors/DependencyMissingKeyError';
import type { IRegistration, ScopePredicate } from './IRegistration';
import { getTransformers } from './IRegistration';
import type { ProviderPipe } from '../provider/ProviderPipe';
import { isProviderPipe } from '../provider/ProviderPipe';
import { BindToken } from '../token/BindToken';
import { UniqToken } from '../token/UniqToken';

export class Registration<T = any> implements IRegistration<T> {
  static fromClass<T>(Target: constructor<T>) {
    const transform = pipe(...getTransformers(Target));
    return transform(new Registration(() => Provider.fromClass(Target), Target.name));
  }

  static fromValue<T>(value: T) {
    if (Is.constructor(value)) {
      const transform = pipe(...getTransformers(value as constructor<T>));
      return transform(new Registration(() => Provider.fromValue(value), value.name));
    }
    return new Registration(() => Provider.fromValue(value));
  }

  static fromFn<T>(fn: ResolveDependency<T>) {
    return new Registration(() => new Provider(fn));
  }

  static fromKey<T>(key: DependencyKey) {
    return new Registration<T>(() => Provider.fromKey(key));
  }

  private mappers: MapFn<IProvider<T>>[] = [];
  private aliases: Set<DependencyKey> = new Set();

  constructor(
    private createProvider: () => IProvider<T>,
    private key?: DependencyKey,
    private scopePredicates: ScopePredicate[] = [],
  ) {}

  bindToKey(key: DependencyKey): this {
    this.key = key;
    return this;
  }

  bindToAlias(alias: DependencyKey): this {
    this.aliases.add(alias);
    return this;
  }

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderPipe<T>)[]): this {
    const fns = mappers.map((m): MapFn<IProvider<T>> => (isProviderPipe<T>(m) ? m.mapProvider.bind(m) : m));
    this.mappers.push(...fns);
    return this;
  }

  when(...predicates: ScopePredicate[]): this {
    this.scopePredicates.push(...predicates);
    return this;
  }

  bindTo(key: DependencyKey | BindToken): this {
    if (Is.dependencyKey(key)) {
      new UniqToken(key).bindTo(this);
      return this;
    }

    key.bindTo(this);
    return this;
  }

  private matchScope(container: IContainer): boolean {
    if (this.scopePredicates.length === 0) {
      return true;
    }
    const [first, ...rest] = this.scopePredicates;
    return rest.reduce((prev, curr) => curr(container, prev), first(container));
  }

  applyTo(container: IContainer): void {
    if (!this.matchScope(container)) {
      return;
    }

    if (!this.key) {
      throw new DependencyMissingKeyError('No key provided for registration');
    }

    const provider = this.createProvider();
    container.register(this.key, provider.pipe(...this.mappers), { aliases: [...this.aliases] });
  }
}
