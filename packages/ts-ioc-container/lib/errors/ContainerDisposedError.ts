import { ContainerError } from './ContainerError';

export class ContainerDisposedError extends ContainerError {
  name = 'ContainerDisposedError';
  readonly code = 'IOC_CONTAINER_DISPOSED';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, ContainerDisposedError.prototype);
  }
}
