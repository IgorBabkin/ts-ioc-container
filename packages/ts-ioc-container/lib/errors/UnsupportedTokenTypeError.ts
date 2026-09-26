import { ContainerError } from './ContainerError';

/** Thrown by `toToken` for a value that is not a token, key, class or function. Code `IOC_UNSUPPORTED_TOKEN_TYPE`. */
export class UnsupportedTokenTypeError extends ContainerError {
  name = 'UnsupportedTokenTypeError';
  readonly code = 'IOC_UNSUPPORTED_TOKEN_TYPE';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, UnsupportedTokenTypeError.prototype);
  }
}
