import { IContainer } from '../container/IContainer';
import { RegistrationConflictError } from '../errors/RegistrationConflictError';

import { IRegistration, RegistrationDecorator } from './IRegistration';

export class ThrowErrorIfNoDependency extends RegistrationDecorator {
  constructor(private module: IRegistration) {
    super(module);
  }

  applyTo(container: IContainer): void {
    RegistrationConflictError.assert(
      container.hasDependency(this.module.getKey()) === undefined,
      `Provider for key ${this.module.getKey().toString()} is already registered`,
    );
    this.module.applyTo(container);
  }
}
