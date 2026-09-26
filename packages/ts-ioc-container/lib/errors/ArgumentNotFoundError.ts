import { ContainerError } from './ContainerError';

export class ArgumentNotFoundError extends ContainerError {
  name = 'ArgumentNotFoundError';
  readonly code = 'IOC_ARGUMENT_NOT_FOUND';

  constructor(message = 'Argument not found') {
    super(message);

    Object.setPrototypeOf(this, ArgumentNotFoundError.prototype);
  }
}
