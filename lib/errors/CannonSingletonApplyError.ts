import { ContainerError } from './ContainerError';

export class CannonSingletonApplyError extends ContainerError {
  name = 'CannonSingletonApplyError';

  constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, CannonSingletonApplyError.prototype);
  }
}
