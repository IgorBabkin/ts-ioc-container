import { DependencyMissingKeyError } from './DependencyMissingKeyError';
import { DependencyKey, IContainer, IContainerModule } from '../container/IContainer';
import { constructor, MapFn } from '../utils';
import { getMetadata, setMetadata } from '../metadata';
import { Provider } from '../provider/Provider';
import { IProvider } from '../provider/IProvider';

const DEPENDENCY_KEY = 'DependencyKey';

export const key = (value: DependencyKey): ClassDecorator => setMetadata(DEPENDENCY_KEY, value);

export class Registration implements IContainerModule {
  static fromClass(Target: constructor<unknown>): Registration {
    const dependencyKey = getMetadata<DependencyKey>(Target, DEPENDENCY_KEY);
    if (dependencyKey === undefined) {
      throw new DependencyMissingKeyError(`Pls provide dependency key for ${Target.name}`);
    }
    return new Registration(dependencyKey, Provider.fromClass(Target));
  }

  constructor(private key: DependencyKey, private provider: IProvider) {}

  pipe(...mappers: MapFn<IProvider>[]): this {
    this.provider = this.provider.pipe(...mappers);
    return this;
  }

  applyTo(container: IContainer): void {
    container.register(this.key, this.provider);
  }
}
