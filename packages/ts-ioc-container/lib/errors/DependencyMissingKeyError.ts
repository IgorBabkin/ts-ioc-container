import { ContainerError } from './ContainerError';

export class DependencyMissingKeyError extends ContainerError {
  name = 'DependencyMissingKeyError';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, DependencyMissingKeyError.prototype);
  }
}
