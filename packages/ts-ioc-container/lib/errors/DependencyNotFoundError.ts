import { ContainerError } from './ContainerError';

/** Thrown when a key or alias is not found in the scope or any parent. Code `IOC_DEPENDENCY_NOT_FOUND`. */
export class DependencyNotFoundError extends ContainerError {
  name = 'DependencyNotFoundError';
  readonly code = 'IOC_DEPENDENCY_NOT_FOUND';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, DependencyNotFoundError.prototype);
  }
}
