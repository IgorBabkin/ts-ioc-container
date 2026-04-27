import 'reflect-metadata';
import { args, ClassToken, Container, inject } from '../../lib';

describe('ClassToken', () => {
  class TestClass {
    constructor(@inject(args(0)) public value: string = 'default') {}
  }

  it('should resolve class with default value when no args supplied', () => {
    const token = new ClassToken(TestClass);
    const result = token.resolve(new Container());
    expect(result).toBeInstanceOf(TestClass);
    expect(result.value).toBe('default');
  });

  it('chained args+argsFn: first arg wins because args(0) reads position 0', () => {
    const token = new ClassToken(TestClass).args('first').argsFn(() => ['second']);
    const result = token.resolve(new Container());
    expect(result.value).toBe('first');
  });

  it('should support lazy method returning new token instance', () => {
    const token = new ClassToken(TestClass);
    const lazyToken = token.lazy();
    expect(lazyToken).toBeInstanceOf(ClassToken);
    expect(lazyToken).not.toBe(token);
  });
});
