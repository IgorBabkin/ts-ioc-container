import { DependencyKey, IContainer } from '../container/IContainer';
import { constructor, MapFn } from '../utils';
import { getMetadata, setMetadata } from '../metadata';
import { Provider } from '../provider/Provider';
import { IProvider } from '../provider/IProvider';
import { ThrowErrorIfNoDependency } from './ThrowErrorIfNoDependency';
import { IRegistration } from './IRegistration';

const DEPENDENCY_KEY = 'DependencyKey';

export const key = (value: DependencyKey) => setMetadata(DEPENDENCY_KEY, value);

export class Registration implements IRegistration {
  static fromClass(Target: constructor<unknown>) {
    const dependencyKey = getMetadata<DependencyKey>(Target, DEPENDENCY_KEY);
    return new Registration(dependencyKey ?? Target.name, Provider.fromClass(Target));
  }

  constructor(private key: DependencyKey, private provider: IProvider) {}

  getKey(): DependencyKey {
    return this.key;
  }

  to(key: DependencyKey): this {
    this.key = key;
    return this;
  }

  throwErrorOnConflict() {
    return new ThrowErrorIfNoDependency(this);
  }

  pipe(...mappers: MapFn<IProvider>[]): this {
    this.provider = this.provider.pipe(...mappers);
    return this;
  }

  applyTo(container: IContainer): void {
    container.register(this.key, this.provider);
  }
}
