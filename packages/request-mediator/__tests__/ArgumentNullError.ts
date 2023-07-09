export class ArgumentNullError extends Error {
  name = 'ArgumentNullError';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, ArgumentNullError.prototype);
  }
}
