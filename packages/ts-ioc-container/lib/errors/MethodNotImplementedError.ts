import { ContainerError } from './ContainerError';

export class MethodNotImplementedError extends ContainerError {
  name = 'MethodNotImplementedError';
  readonly code = 'IOC_METHOD_NOT_IMPLEMENTED';

  constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, MethodNotImplementedError.prototype);
  }
}
