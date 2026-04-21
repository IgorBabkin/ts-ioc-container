import { Container, FunctionToken } from '../../lib';
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

  it('should support args method', () => {
    const token = new FunctionToken((_, { args = [] }) => args[0] as string);
    const result = token.args('custom').resolve(container);
    expect(result).toBe('custom');
  });

  it('should support argsFn method', () => {
    const token = new FunctionToken((_, { args = [] }) => args[0] as string);
    const result = token.argsFn(() => ['from-fn']).resolve(container);
    expect(result).toBe('from-fn');
  });

  it('should support lazy method', () => {
    let receivedLazy: boolean | undefined;
    const token = new FunctionToken((_, { lazy }) => {
      receivedLazy = lazy;
      return 'value';
    });
    token.lazy().resolve(container);
    expect(receivedLazy).toBe(true);
  });
});
