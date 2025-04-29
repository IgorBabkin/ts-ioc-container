import { ContainerError } from './ContainerError';

export class DependencyNotFoundError extends ContainerError {
  name = 'DependencyNotFoundError';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, DependencyNotFoundError.prototype);
  }
}
