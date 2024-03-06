import { DependencyKey, IContainer, IContainerModule } from '../container/IContainer';
import { MapFn } from '../utils';
import { IProvider } from '../provider/IProvider';

export interface IRegistration extends IContainerModule {
  getKey(): DependencyKey;

  to(key: DependencyKey): this;

  pipe(...mappers: MapFn<IProvider>[]): this;
}

export abstract class RegistrationDecorator implements IRegistration {
  constructor(private decorated: IRegistration) {}

  getKey(): DependencyKey {
    return this.decorated.getKey();
  }

  to(key: DependencyKey): this {
    this.decorated.to(key);
    return this;
  }

  pipe(...mappers: MapFn<IProvider>[]): this {
    this.decorated.pipe(...mappers);
    return this;
  }

  applyTo(container: IContainer): void {
    this.decorated.applyTo(container);
  }
}
