export class UnexpectedHookResultError extends Error {
  name = 'UnexpectedHookResultError';

  constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, UnexpectedHookResultError.prototype);
  }
}
