import { ConstantToken, Container, MethodNotImplementedError } from '../../lib';
import type { IContainer } from '../../lib/container/IContainer';

describe('ConstantToken', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container();
  });

  it('should resolve constant value', () => {
    const token = new ConstantToken('constant-value');
    const result = token.resolve(container);
    expect(result).toBe('constant-value');
  });

  it('should throw error on args method', () => {
    const token = new ConstantToken('value');
    expect(() => token.args('arg1')).toThrow(MethodNotImplementedError);
    expect(() => token.args('arg1')).toThrow('not implemented');
  });

  it('should throw error on argsFn method', () => {
    const token = new ConstantToken('value');
    expect(() => token.argsFn(() => [])).toThrow(MethodNotImplementedError);
    expect(() => token.argsFn(() => [])).toThrow('not implemented');
  });

  it('should throw error on lazy method', () => {
    const token = new ConstantToken('value');
    expect(() => token.lazy()).toThrow(MethodNotImplementedError);
    expect(() => token.lazy()).toThrow('not implemented');
  });
});
