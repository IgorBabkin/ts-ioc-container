import { ContainerError } from './ContainerError';

export class DependencyMissingKeyError extends ContainerError {
  name = 'DependencyMissingKeyError';
  readonly code = 'IOC_DEPENDENCY_MISSING_KEY';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, DependencyMissingKeyError.prototype);
  }
}
