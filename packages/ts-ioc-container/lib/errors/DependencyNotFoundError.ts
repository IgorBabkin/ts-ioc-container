export class DependencyNotFoundError extends Error {
  name = 'DependencyNotFoundError';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, DependencyNotFoundError.prototype);
  }
}
