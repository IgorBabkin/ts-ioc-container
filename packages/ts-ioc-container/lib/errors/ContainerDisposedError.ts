import { ContainerError } from './ContainerError';

export class ContainerDisposedError extends ContainerError {
  name = 'ContainerDisposedError';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, ContainerDisposedError.prototype);
  }
}
