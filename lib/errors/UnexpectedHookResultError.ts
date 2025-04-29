import { ContainerError } from './ContainerError';

export class UnexpectedHookResultError extends ContainerError {
  name = 'UnexpectedHookResultError';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, UnexpectedHookResultError.prototype);
  }
}
