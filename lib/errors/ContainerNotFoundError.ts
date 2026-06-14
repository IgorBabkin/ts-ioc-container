import { ContainerError } from './ContainerError';

export class ContainerNotFoundError extends ContainerError {
  name = 'ContainerNotFoundError';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, ContainerNotFoundError.prototype);
  }
}
