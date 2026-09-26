import { ContainerError } from './ContainerError';

export class ProviderDisposedError extends ContainerError {
  name = 'ProviderDisposedError';
  readonly code = 'IOC_PROVIDER_DISPOSED';

  /**
   * @throws {ProviderDisposedError} when `isTrue` is falsy.
   */
  static assert(isTrue: boolean, failMessage: string) {
    if (!isTrue) {
      throw new ProviderDisposedError(failMessage);
    }
  }

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, ProviderDisposedError.prototype);
  }
}
