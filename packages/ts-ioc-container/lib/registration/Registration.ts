import { DependencyKey, IContainer } from '../container/IContainer';
import { constructor, isConstructor, MapFn, pipe } from '../utils';
import { Provider } from '../provider/Provider';
import { IProvider, ResolveDependency } from '../provider/IProvider';
import { DependencyMissingKeyError } from '../errors/DependencyMissingKeyError';
import { getTransformers, IRegistration, ScopePredicate } from './IRegistration';

export class Registration<T = any> implements IRegistration<T> {
  private redirectKeys: Set<DependencyKey> = new Set();

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

  private mappers: MapFn<IProvider<T>>[] = [];

  constructor(
    private createProvider: (key: DependencyKey) => IProvider<T>,
    private key?: DependencyKey,
    private matchScope: ScopePredicate = () => true,
  ) {}

  to(key: DependencyKey): this {
    this.key = key;
    return this;
  }

  redirectFrom(key: DependencyKey): this {
    this.redirectKeys.add(key);
    return this;
  }

  pipe(...mappers: MapFn<IProvider<T>>[]): this {
    this.mappers.push(...mappers);
    return this;
  }

  when(isValidWhen: ScopePredicate): this {
    this.matchScope = isValidWhen;
    return this;
  }

  applyTo(container: IContainer): void {
    if (!this.matchScope(container)) {
      return;
    }

    if (!this.key) {
      throw new DependencyMissingKeyError('No key provided for registration');
    }

    const key = this.key;

    container.register(key, this.createProvider(key).pipe(...this.mappers));
    for (const redirectKey of this.redirectKeys) {
      container.register(redirectKey, new Provider((s) => s.resolve(key)));
    }
  }
}
