import { ContainerError } from './ContainerError';

/** Thrown by `findOrFail` when no runtime arg matches the predicate. Code `IOC_ARGUMENT_NOT_FOUND`. */
export class ArgumentNotFoundError extends ContainerError {
  name = 'ArgumentNotFoundError';
  readonly code = 'IOC_ARGUMENT_NOT_FOUND';

  constructor(message = 'Argument not found') {
    super(message);

    Object.setPrototypeOf(this, ArgumentNotFoundError.prototype);
  }
}
