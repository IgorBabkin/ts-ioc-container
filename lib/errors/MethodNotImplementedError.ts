export class MethodNotImplementedError extends Error {
  name = 'MethodNotImplementedError';

  constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, MethodNotImplementedError.prototype);
  }
}
