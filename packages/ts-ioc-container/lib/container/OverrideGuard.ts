import { DependencyKey, IContainer, IContainerModule } from './IContainer';
import { RegistrationConflictError } from '../errors/RegistrationConflictError';

export class OverrideGuard implements IContainerModule {
  applyTo(container: IContainer, key: DependencyKey): void {
    RegistrationConflictError.assert(
      container.findProvider(key) === undefined,
      `Provider for key ${key.toString()} is already registered`,
    );
  }
}
