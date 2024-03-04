export class RegistrationConflictError extends Error {
  static assert(isTrue: boolean, failMessage: string) {
    if (!isTrue) {
      throw new RegistrationConflictError(failMessage);
    }
  }

  name = 'RegistrationConflictError';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, RegistrationConflictError.prototype);
  }
}
