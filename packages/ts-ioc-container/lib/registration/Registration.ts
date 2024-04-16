import { Alias, DependencyKey, IContainer } from '../container/IContainer';
import { constructor, isConstructor, MapFn, pipe } from '../utils';
import { getMetadata, setMetadata } from '../metadata';
import { Provider } from '../provider/Provider';
import { IProvider, ResolveDependency } from '../provider/IProvider';
import { DependencyMissingKeyError } from '../errors/DependencyMissingKeyError';
import { IRegistration, ScopePredicate } from './IRegistration';

const DEPENDENCY_KEY = 'DEPENDENCY_KEY';

export class Registration<T = unknown> implements IRegistration {
  static fromClass<T>(Target: constructor<T>) {
    const transform = pipe(...(getMetadata<MapFn<Registration<T>>[]>(Target, DEPENDENCY_KEY) ?? []));
    return transform(new Registration(() => Provider.fromClass(Target), Target.name));
  }

  static fromValue<T>(value: T) {
    if (isConstructor(value)) {
      const transform = pipe(...(getMetadata<MapFn<Registration<T>>[]>(value, DEPENDENCY_KEY) ?? []));
      return transform(new Registration(() => Provider.fromValue(value), value.name));
    }
    return new Registration(() => Provider.fromValue(value));
  }

  static fromFn<T>(fn: ResolveDependency<T>) {
    return new Registration(() => new Provider(fn));
  }

  private aliases: string[] = [];

  constructor(
    private createProvider: () => IProvider<T>,
    private key?: DependencyKey,
    private matchScope: ScopePredicate = () => true,
  ) {}

  to(key: DependencyKey): this {
    this.key = key;
    return this;
  }

  addAliases(...aliases: Alias[]): this {
    for (const alias of aliases) {
      this.aliases.push(alias);
    }
    return this;
  }

  pipe(...mappers: MapFn<IProvider<T>>[]): this {
    const fn = this.createProvider;
    this.createProvider = () => fn().pipe(...mappers);
    return this;
  }

  applyTo(container: IContainer): void {
    if (!this.matchScope(container)) {
      return;
    }

    if (!this.key) {
      throw new DependencyMissingKeyError('No key provided for registration');
    }

    container.register(this.key, this.createProvider(), this.aliases);
  }

  setScopePredicate(isValidWhen: ScopePredicate): this {
    this.matchScope = isValidWhen;
    return this;
  }
}

export const register = (...mappers: MapFn<IRegistration>[]) => setMetadata(DEPENDENCY_KEY, mappers);
