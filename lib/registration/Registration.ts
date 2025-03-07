import { DependencyKey, IContainer } from '../container/IContainer';
import { constructor, isConstructor, MapFn, pipe } from '../utils';
import { Provider } from '../provider/Provider';
import { IProvider, ResolveDependency } from '../provider/IProvider';
import { DependencyMissingKeyError } from '../errors/DependencyMissingKeyError';
import { getRegistrationTransformers, IRegistration, ScopePredicate } from './IRegistration';

export class Registration<T = any> implements IRegistration<T> {
  private redirectKeys: Set<DependencyKey> = new Set();

  static toClass<T>(Target: constructor<T>) {
    const transform = pipe(...getRegistrationTransformers(Target));
    return transform(new Registration(() => Provider.fromClass(Target), Target.name));
  }

  static toValue<T>(value: T) {
    if (isConstructor(value)) {
      const transform = pipe(...getRegistrationTransformers(value as constructor<T>));
      return transform(new Registration(() => Provider.fromValue(value), value.name));
    }
    return new Registration(() => Provider.fromValue(value));
  }

  static toFn<T>(fn: ResolveDependency<T>) {
    return new Registration(() => new Provider(fn));
  }

  static toKey<T>(key: DependencyKey) {
    return new Registration<T>(() => Provider.fromKey(key));
  }

  private mappers: MapFn<IProvider<T>>[] = [];

  constructor(
    private createProvider: (key: DependencyKey) => IProvider<T>,
    private key?: DependencyKey,
    private scopePredicates: ScopePredicate[] = [],
  ) {}

  fromKey(key: DependencyKey): this {
    this.key = key;
    return this;
  }

  redirectFrom(...keys: DependencyKey[]): this {
    for (const key of keys) {
      this.redirectKeys.add(key);
    }
    return this;
  }

  pipe(...mappers: MapFn<IProvider<T>>[]): this {
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

    const key = this.key;

    const provider = this.createProvider(key).pipe(...this.mappers);
    container.register(key, provider);

    for (const redirectKey of this.redirectKeys) {
      container.register(redirectKey, new Provider((s) => s.resolve(key)));
    }
  }
}
