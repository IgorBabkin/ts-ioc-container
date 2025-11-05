import { ContainerError } from './ContainerError';

export class UnsupportedTokenTypeError extends ContainerError {
  name = 'UnsupportedTokenTypeError';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, UnsupportedTokenTypeError.prototype);
  }
}
