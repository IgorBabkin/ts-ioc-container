import { DependencyKey, IContainer, IContainerModule, IRegistrationOptions } from '../container/IContainer';
import { constructor, MapFn } from '../utils';
import { getMetadata, setMetadata } from '../metadata';
import { Provider } from './Provider';
import { IProvider } from './IProvider';

const DEPENDENCY_KEY = 'DependencyKey';

type RegistrationMetadata = {
  key: DependencyKey;
  options?: IRegistrationOptions;
};

export const key = (value: DependencyKey, options?: IRegistrationOptions): ClassDecorator => {
  const metadata: RegistrationMetadata = { key: value, options };
  return setMetadata(DEPENDENCY_KEY, metadata);
};

export class Registration implements IContainerModule {
  static fromClass(Target: constructor<unknown>): Registration {
    const metadata = getMetadata<RegistrationMetadata>(Target, DEPENDENCY_KEY);
    return new Registration(metadata?.key ?? Target.name, Provider.fromClass(Target), metadata?.options);
  }

  constructor(
    private key: DependencyKey,
    private provider: IProvider,
    private registrationOptions: IRegistrationOptions = {},
  ) {}

  options(value: IRegistrationOptions): this {
    this.registrationOptions = value;
    return this;
  }

  pipe(...mappers: MapFn<IProvider>[]): this {
    this.provider = this.provider.pipe(...mappers);
    return this;
  }

  applyTo(container: IContainer): void {
    container.register(this.key, this.provider, this.registrationOptions);
  }
}
