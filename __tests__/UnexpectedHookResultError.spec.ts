import { UnexpectedHookResultError } from '../lib/errors/UnexpectedHookResultError';

describe('UnexpectedHookResultError', () => {
  it('should create an error with the correct name', () => {
    const error = new UnexpectedHookResultError();
    expect(error.name).toBe('UnexpectedHookResultError');
  });

  it('should create an error with the provided message', () => {
    const message = 'Test error message';
    const error = new UnexpectedHookResultError(message);
    expect(error.message).toBe(message);
  });

  it('should be an instance of Error', () => {
    const error = new UnexpectedHookResultError();
    expect(error).toBeInstanceOf(Error);
  });

  it('should maintain prototype chain correctly', () => {
    const error = new UnexpectedHookResultError();
    expect(Object.getPrototypeOf(error)).toBe(UnexpectedHookResultError.prototype);
  });
});
