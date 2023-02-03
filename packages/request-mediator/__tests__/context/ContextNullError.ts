export class ContextNullError extends Error {
  name = 'ContextNullError';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, ContextNullError.prototype);
  }
}
