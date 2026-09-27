import { ContainerError } from './ContainerError';

/** Signals that no container is associated with a target. Code `IOC_CONTAINER_NOT_FOUND`. */
export class ContainerNotFoundError extends ContainerError {
  name = 'ContainerNotFoundError';
  readonly code = 'IOC_CONTAINER_NOT_FOUND';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, ContainerNotFoundError.prototype);
  }
}
