import { ContainerError } from './ContainerError';

/** Thrown by a method the object does not support; the message names the class and method. Code `IOC_METHOD_NOT_IMPLEMENTED`. */
export class MethodNotImplementedError extends ContainerError {
  name = 'MethodNotImplementedError';
  readonly code = 'IOC_METHOD_NOT_IMPLEMENTED';

  constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, MethodNotImplementedError.prototype);
  }
}
