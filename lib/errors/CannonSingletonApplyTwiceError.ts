import { ContainerError } from './ContainerError';

export class CannonSingletonApplyTwiceError extends ContainerError {
  name = 'CannonSingletonApplyTwiceError';

  constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, CannonSingletonApplyTwiceError.prototype);
  }

  /**
   * @throws {CannonSingletonApplyTwiceError} when `isTrue` is falsy.
   */
  static assert(isTrue: boolean, failMessage: string) {
    if (!isTrue) {
      throw new CannonSingletonApplyTwiceError(failMessage);
    }
  }
}
