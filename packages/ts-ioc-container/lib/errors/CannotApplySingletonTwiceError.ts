import { ContainerError } from './ContainerError';

/** Thrown when `singleton()` is applied twice to one provider. Code `IOC_SINGLETON_APPLIED_TWICE`. */
export class CannotApplySingletonTwiceError extends ContainerError {
  name = 'CannotApplySingletonTwiceError';
  readonly code = 'IOC_SINGLETON_APPLIED_TWICE';

  constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, CannotApplySingletonTwiceError.prototype);
  }

  /**
   * @throws {CannotApplySingletonTwiceError} when `isTrue` is falsy.
   */
  static assert(isTrue: boolean, failMessage: string) {
    if (!isTrue) {
      throw new CannotApplySingletonTwiceError(failMessage);
    }
  }
}
