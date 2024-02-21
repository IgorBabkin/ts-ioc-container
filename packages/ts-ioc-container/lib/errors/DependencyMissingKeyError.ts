export class DependencyMissingKeyError extends Error {
  name = 'DependencyMissingKeyError';

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, DependencyMissingKeyError.prototype);
  }
}
