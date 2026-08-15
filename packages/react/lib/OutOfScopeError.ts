export class OutOfScopeError extends Error {
  name = 'OutOfScopeError';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, OutOfScopeError.prototype);
  }
}
