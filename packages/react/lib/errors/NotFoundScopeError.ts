export class NotFoundScopeError extends Error {
  name = 'NotFoundScopeError';

  constructor(message: string = 'Scope not found. useScopeOrFail must be used within a Scope component.') {
    super(message);

    Object.setPrototypeOf(this, NotFoundScopeError.prototype);
  }
}
