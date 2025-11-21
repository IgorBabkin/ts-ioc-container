import { ClassToken, Container } from '../../lib';
import type { IContainer } from '../../lib/container/IContainer';

describe('ClassToken', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container();
  });

  class TestClass {
    constructor(public value: string = 'default') {}
  }

  it('should resolve class', () => {
    const token = new ClassToken(TestClass);
    const result = token.resolve(container);
    expect(result).toBeInstanceOf(TestClass);
    expect(result.value).toBe('default');
  });

  it('should support args method', () => {
    const token = new ClassToken(TestClass);
    const tokenWithArgs = token.args('custom');
    const result = tokenWithArgs.resolve(container);
    expect(result).toBeInstanceOf(TestClass);
    expect(result.value).toBe('custom');
  });

  it('should support argsFn method', () => {
    const token = new ClassToken(TestClass);
    const tokenWithArgs = token.argsFn(() => ['from-fn']);
    const result = tokenWithArgs.resolve(container);
    expect(result).toBeInstanceOf(TestClass);
    expect(result.value).toBe('from-fn');
  });

  it('should support chaining args and argsFn', () => {
    const token = new ClassToken(TestClass);
    const tokenWithArgs = token.args('arg1').argsFn(() => ['arg2']);
    const result = tokenWithArgs.resolve(container);
    expect(result).toBeInstanceOf(TestClass);
    // argsFn appends to existing args, so 'arg1' comes first
    expect(result.value).toBe('arg1');
  });

  it('should support lazy method', () => {
    const token = new ClassToken(TestClass);
    const lazyToken = token.lazy();
    expect(lazyToken).toBeInstanceOf(ClassToken);
    expect(lazyToken).not.toBe(token);
  });
});
