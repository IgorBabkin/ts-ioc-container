import { ContainerError } from './ContainerError';

export class TypedEventDisposedError extends ContainerError {
  name = 'TypedEventDisposedError';
  readonly code = 'IOC_EVENT_DISPOSED';

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
