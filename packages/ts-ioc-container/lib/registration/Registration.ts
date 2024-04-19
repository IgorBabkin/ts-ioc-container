import { Alias, DependencyKey, IContainer } from '../container/IContainer';
import { constructor, groupBy, MapFn, pipe } from '../utils';
import { Provider } from '../provider/Provider';
import { IProvider, isProviderMapper, ResolveDependency } from '../provider/IProvider';
import { DependencyMissingKeyError } from '../errors/DependencyMissingKeyError';
import { getTransformers, IRegistration, ScopePredicate } from './IRegistration';

export class Registration<T = unknown> implements IRegistration<T> {
  static fromClass<T>(Target: constructor<T>) {
    return new Registration(() => Provider.fromClass(Target), Target.name).pipe(...getTransformers(Target));
  }

  static fromValue<T>(value: T) {
    return new Registration(() => Provider.fromValue(value));
  }

  static fromFn<T>(fn: ResolveDependency<T>) {
    return new Registration(() => new Provider(fn));
  }

  private aliases: string[] = [];
  private mappers: MapFn<IProvider<T>>[] = [];
  private matchScope: ScopePredicate = () => true;

  constructor(
    private createProvider: () => IProvider<T>,
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

  pipe(...mappers: (MapFn<IRegistration<T>> | MapFn<IProvider<T>>)[]): IRegistration<T> {
    const [providerMappers, registrationMappers] = groupBy(mappers, isProviderMapper);
    this.mappers.push(...(providerMappers as MapFn<IProvider<T>>[]));
    return pipe(...(registrationMappers as MapFn<IRegistration<T>>[]))(this);
  }

  provider(...mappers: MapFn<IProvider<T>>[]): this {
    this.mappers.push(...mappers);
    return this;
  }

  applyTo(container: IContainer): void {
    if (!this.matchScope(container)) {
      return;
    }

    if (!this.key) {
      throw new DependencyMissingKeyError('No key provided for registration');
    }

    container.register(this.key, this.createProvider().pipe(...this.mappers), this.aliases);
  }

  when(isValidWhen: ScopePredicate): this {
    this.matchScope = isValidWhen;
    return this;
  }
}
