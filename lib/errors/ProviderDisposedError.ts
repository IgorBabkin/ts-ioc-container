import { ContainerError } from './ContainerError';

export class ProviderDisposedError extends ContainerError {
  name = 'ProviderDisposedError';

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
