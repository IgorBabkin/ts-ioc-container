import { ContainerError } from './ContainerError';

export class DependencyNotFoundError extends ContainerError {
  name = 'DependencyNotFoundError';
  readonly code = 'IOC_DEPENDENCY_NOT_FOUND';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, DependencyNotFoundError.prototype);
  }
}
