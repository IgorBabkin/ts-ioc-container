import { ContainerError } from './ContainerError';

/** Thrown when a disposed scope is used. Code `IOC_CONTAINER_DISPOSED`. */
export class ContainerDisposedError extends ContainerError {
  name = 'ContainerDisposedError';
  readonly code = 'IOC_CONTAINER_DISPOSED';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, ContainerDisposedError.prototype);
  }
}
