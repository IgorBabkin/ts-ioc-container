import { Container, FunctionToken, MethodNotImplementedError } from '../../lib';
import type { IContainer } from '../../lib/container/IContainer';

describe('FunctionToken', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container();
  });

  it('should resolve function result', () => {
    const token = new FunctionToken(() => 'function-result');
    const result = token.resolve(container);
    expect(result).toBe('function-result');
  });

  it('should pass container to function', () => {
    const token = new FunctionToken((c) => {
      expect(c).toBe(container);
      return 'result';
    });
    const result = token.resolve(container);
    expect(result).toBe('result');
  });

  it('should throw error on args method', () => {
    const token = new FunctionToken(() => 'value');
    expect(() => token.args('arg1')).toThrow(MethodNotImplementedError);
    expect(() => token.args('arg1')).toThrow('not implemented');
  });

  it('should throw error on argsFn method', () => {
    const token = new FunctionToken(() => 'value');
    expect(() => token.argsFn(() => [])).toThrow(MethodNotImplementedError);
    expect(() => token.argsFn(() => [])).toThrow('not implemented');
  });

  it('should throw error on lazy method', () => {
    const token = new FunctionToken(() => 'value');
    expect(() => token.lazy()).toThrow(MethodNotImplementedError);
    expect(() => token.lazy()).toThrow('not implemented');
  });
});
