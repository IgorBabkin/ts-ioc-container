import { DependencyKey, IContainer } from '../container/IContainer';
import { RegistrationConflictError } from '../errors/RegistrationConflictError';

import { IRegistration } from './IRegistration';

export class ThrowErrorIfNoDependency implements IRegistration {
  constructor(private module: IRegistration) {}

  getKey(): DependencyKey {
    return this.module.getKey();
  }

  applyTo(container: IContainer): void {
    RegistrationConflictError.assert(
      container.hasDependency(this.module.getKey()) === undefined,
      `Provider for key ${this.module.getKey().toString()} is already registered`,
    );
    this.module.applyTo(container);
  }
}
