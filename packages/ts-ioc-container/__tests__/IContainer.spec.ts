import { isDependencyKey } from 'ts-ioc-container';

describe('IContainer', function () {
  it('should accept a symbol as dependency key', function () {
    expect(isDependencyKey(Symbol('key'))).toBe(true);
  });
  it('should accept a string as dependency key', function () {
    expect(isDependencyKey('key')).toBe(true);
  });
});
