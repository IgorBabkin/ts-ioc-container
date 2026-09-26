import { ContainerError } from './ContainerError';

export class UnsupportedTokenTypeError extends ContainerError {
  name = 'UnsupportedTokenTypeError';
  readonly code = 'IOC_UNSUPPORTED_TOKEN_TYPE';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, UnsupportedTokenTypeError.prototype);
  }
}
