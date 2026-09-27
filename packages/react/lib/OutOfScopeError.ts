export class OutOfScopeError extends Error {
  name = 'OutOfScopeError';
  readonly code = 'IOC_OUT_OF_SCOPE';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, OutOfScopeError.prototype);
  }
}
