import { DependencyKey, IContainer } from '../container/IContainer';
import { constructor, isConstructor, MapFn, pipe } from '../utils';
import { Provider } from '../provider/Provider';
import { IProvider, ProviderMapper, ResolveDependency } from '../provider/IProvider';
import { DependencyMissingKeyError } from '../errors/DependencyMissingKeyError';
import { getTransformers, IRegistration, ScopePredicate } from './IRegistration';

export class Registration<T = any> implements IRegistration<T> {
  static fromClass<T>(Target: constructor<T>) {
    const transform = pipe(...getTransformers(Target));
    return transform(new Registration(() => Provider.fromClass(Target), Target.name));
  }

  static fromValue<T>(value: T) {
    if (isConstructor(value)) {
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

  private mappers: Array<MapFn<IProvider<T>> | ProviderMapper> = [];
  private aliases: Set<DependencyKey> = new Set();

  constructor(
    private createProvider: () => IProvider<T>,
    private key?: DependencyKey,
    private scopePredicates: ScopePredicate[] = [],
  ) {}

  assignToKey(key: DependencyKey): this {
    this.key = key;
    return this;
  }

  assignToAliases(...aliases: DependencyKey[]): this {
    for (const alias of aliases) {
      this.aliases.add(alias);
    }
    return this;
  }

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderMapper)[]): this {
    this.mappers.push(...mappers);
    return this;
  }

  when(...predicates: ScopePredicate[]): this {
    this.scopePredicates.push(...predicates);
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
