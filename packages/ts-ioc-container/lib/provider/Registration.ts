import { Alias, DependencyKey, IContainer, IContainerModule } from '../container/IContainer';
import { constructor, isConstructor, MapFn, pipe } from '../utils';
import { getMetadata, setMetadata } from '../metadata';
import { Provider } from './Provider';
import { IProvider, ResolveDependency } from './IProvider';
import { DependencyMissingKeyError } from '../errors/DependencyMissingKeyError';

const DEPENDENCY_KEY = 'DEPENDENCY_KEY';

export type IRegistration = IContainerModule;

export class Registration<T = unknown> implements IRegistration {
  static fromClass<T>(Target: constructor<T>) {
    const transform = pipe(...(getMetadata<MapFn<Registration<T>>[]>(Target, DEPENDENCY_KEY) ?? []));
    return transform(new Registration(Provider.fromClass(Target), Target.name));
  }

  static fromValue<T>(value: T) {
    if (isConstructor(value)) {
      const transform = pipe(...(getMetadata<MapFn<Registration<T>>[]>(value, DEPENDENCY_KEY) ?? []));
      return transform(new Registration(Provider.fromValue(value), value.name));
    }
    return new Registration(Provider.fromValue(value));
  }

  static fromFn<T>(fn: ResolveDependency<T>) {
    return new Registration(new Provider(fn));
  }

  private aliases: string[] = [];

  constructor(
    private provider: IProvider<T>,
    private key?: DependencyKey,
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
    this.provider = this.provider.pipe(...mappers);
    return this;
  }

  applyTo(container: IContainer): void {
    if (!this.key) {
      throw new DependencyMissingKeyError('No key provided for registration');
    }
    container.register(this.key, this.provider, this.aliases);
  }
}

export const register = (...mappers: MapFn<Registration>[]) => setMetadata(DEPENDENCY_KEY, mappers);

export const key =
  (key: DependencyKey): MapFn<Registration> =>
  (r) =>
    r.to(key);

export const alias =
  (...aliases: Alias[]): MapFn<Registration> =>
  (r) =>
    r.addAliases(...aliases);
