import { DependencyKey, IContainer, IContainerModule } from '../container/IContainer';
import { constructor, MapFn } from '../utils';
import { getMetadata, setMetadata } from '../metadata';
import { Provider } from './Provider';
import { IProvider, ResolveDependency } from './IProvider';
import { DependencyMissingKeyError } from '../errors/DependencyMissingKeyError';

const DEPENDENCY_KEY = 'DEPENDENCY_KEY';

export const key = (value: DependencyKey) => setMetadata(DEPENDENCY_KEY, value);

export class Registration<T> implements IContainerModule {
  static fromClass<T>(Target: constructor<T>) {
    const dependencyKey = getMetadata<DependencyKey>(Target, DEPENDENCY_KEY);
    return new Registration(Provider.fromClass(Target), dependencyKey ?? Target.name);
  }

  static fromValue<T>(value: T) {
    return new Registration(Provider.fromValue(value));
  }

  static fromFn<T>(fn: ResolveDependency<T>) {
    return new Registration(new Provider(fn));
  }

  constructor(private provider: IProvider<T>, private key?: DependencyKey) {}

  to(key: DependencyKey): this {
    this.key = key;
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
    container.register(this.key, this.provider);
  }
}
