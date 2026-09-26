import { ContainerError } from './ContainerError';

/** Thrown when a registration has no binding key. Code `IOC_DEPENDENCY_MISSING_KEY`. */
export class DependencyMissingKeyError extends ContainerError {
  name = 'DependencyMissingKeyError';
  readonly code = 'IOC_DEPENDENCY_MISSING_KEY';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, DependencyMissingKeyError.prototype);
  }
}
