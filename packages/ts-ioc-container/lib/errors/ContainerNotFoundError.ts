import { ContainerError } from './ContainerError';

export class ContainerNotFoundError extends ContainerError {
  name = 'ContainerNotFoundError';
  readonly code = 'IOC_CONTAINER_NOT_FOUND';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, ContainerNotFoundError.prototype);
  }
}
