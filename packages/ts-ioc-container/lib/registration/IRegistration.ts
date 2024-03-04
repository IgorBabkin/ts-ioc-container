import { DependencyKey, IContainer, IContainerModule } from '../container/IContainer';
import { MapFn } from '../utils';
import { IProvider } from '../provider/IProvider';

export interface IRegistration extends IContainerModule {
  getKey(): DependencyKey;

  setKey(key: DependencyKey): this;

  pipe(...mappers: MapFn<IProvider>[]): this;
}

export abstract class RegistrationDecorator implements IRegistration {
  constructor(private decorated: IRegistration) {}

  getKey(): DependencyKey {
    return this.decorated.getKey();
  }

  setKey(key: DependencyKey): this {
    this.decorated.setKey(key);
    return this;
  }

  pipe(...mappers: MapFn<IProvider>[]): this {
    this.decorated.pipe(...mappers);
    return this;
  }

  applyTo(container: IContainer, ...args: unknown[]): void {
    this.decorated.applyTo(container, ...args);
  }
}
