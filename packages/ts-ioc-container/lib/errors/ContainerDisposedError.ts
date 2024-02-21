export class ContainerDisposedError extends Error {
  static assert(isTrue: boolean, failMessage: string) {
    if (!isTrue) {
      throw new ContainerDisposedError(failMessage);
    }
  }

  name = 'ContainerDisposedError';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, ContainerDisposedError.prototype);
  }
}
