import { ContainerError } from './ContainerError';

export class TypedEventDisposedError extends ContainerError {
  name = 'TypedEventDisposedError';

  /**
   * @throws {TypedEventDisposedError} when `isTrue` is falsy.
   */
  static assert(isTrue: boolean, failMessage: string) {
    if (!isTrue) {
      throw new TypedEventDisposedError(failMessage);
    }
  }

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, TypedEventDisposedError.prototype);
  }
}
