import { ContainerError } from './ContainerError';

export class ArgumentNotFoundError extends ContainerError {
  name = 'ArgumentNotFoundError';

  constructor(message = 'Argument not found') {
    super(message);

    Object.setPrototypeOf(this, ArgumentNotFoundError.prototype);
  }
}
