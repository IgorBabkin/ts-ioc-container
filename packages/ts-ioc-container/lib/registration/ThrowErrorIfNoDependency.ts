import { IContainer } from '../container/IContainer';
import { RegistrationConflictError } from '../errors/RegistrationConflictError';
import { IRegistration, RegistrationDecorator } from './IRegistration';

export class ThrowErrorIfNoDependency extends RegistrationDecorator {
  constructor(private module: IRegistration) {
    super(module);
  }

  applyTo(c: IContainer): void {
    const key = this.module.getKey();
    RegistrationConflictError.assert(!c.hasDependency(key), `Provider for key ${key.toString()} is already registered`);
    this.module.applyTo(c);
  }
}
