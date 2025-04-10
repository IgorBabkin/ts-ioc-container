export class ContainerDisposedError extends Error {
  name = 'ContainerDisposedError';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, ContainerDisposedError.prototype);
  }
}
