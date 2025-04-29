import { ContainerError } from './ContainerError';

export class MethodNotImplementedError extends ContainerError {
  name = 'MethodNotImplementedError';

  constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, MethodNotImplementedError.prototype);
  }
}
