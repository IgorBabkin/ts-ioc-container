export abstract class ContainerError extends Error {
  name = 'ContainerError';

  protected constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, ContainerError.prototype);
  }
}
