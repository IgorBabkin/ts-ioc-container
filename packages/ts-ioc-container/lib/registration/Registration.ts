import { DependencyKey, IContainer } from '../container/IContainer';
import { Provider } from '../provider/Provider';
import type { IProvider, ResolveDependency } from '../provider/IProvider';
import { DependencyMissingKeyError } from '../errors/DependencyMissingKeyError';
import {
  type Bindable,
  type IRegistration,
  type ProviderMapper,
  type ScopeMatchRule,
  getTransformers,
  toBindToken,
  toProviderFn,
} from './IRegistration';
import { type MapFn, pipe } from '../utils/fp';
import { type constructor, Is } from '../utils/basic';

export class Registration<T = any> implements IRegistration<T> {
  static fromClass<T>(Target: constructor<T>, { name }: { name?: string } = {}) {
    const transform = pipe(...getTransformers(Target));
    return transform(new Registration(() => Provider.fromClass(Target), name ?? Target.name));
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
    public key?: DependencyKey,
    private scopeRules: ScopeMatchRule[] = [],
  ) {}

  bindToKey(key: DependencyKey): this {
    this.key = key;
    return this;
  }

  bindToAlias(alias: DependencyKey): this {
    this.aliases.add(alias);
    return this;
  }

  pipe(...mappers: ProviderMapper<T>[]): this {
    this.mappers.push(...mappers.map(toProviderFn));
    return this;
  }

  when(...predicates: ScopeMatchRule[]): this {
    this.scopeRules.push(...predicates);
    return this;
  }

  bindTo(key: Bindable): this {
    toBindToken(key).bindTo(this);
    return this;
  }

  private matchScope(container: IContainer): boolean {
    return this.scopeRules.reduce((prev, curr) => curr(container, prev), true);
  }

  /**
   * @throws {DependencyMissingKeyError} when the registration matches the scope but has no binding key.
   */
  applyTo(container: IContainer): void {
    if (!this.matchScope(container)) {
      return;
    }

    if (!this.key) {
      throw new DependencyMissingKeyError('No key provided for registration');
    }

    const provider = this.mappers.reduce<IProvider<T>>((p, m) => m(p), this.createProvider());
    container.register(this.key, provider, { aliases: [...this.aliases] });
  }

  /**
   * @throws {DependencyMissingKeyError} when no binding key has been set for this registration.
   */
  getKeyOrFail(): DependencyKey {
    if (!this.key) {
      throw new DependencyMissingKeyError('No key provided for registration');
    }
    return this.key;
  }
}
