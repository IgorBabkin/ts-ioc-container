import { Container, FunctionToken } from '../../lib';

describe('FunctionToken', () => {
  it('should pass lazy: true to the resolver function when token is lazy', () => {
    let receivedLazy: boolean | undefined;
    const token = new FunctionToken((_, { lazy }) => {
      receivedLazy = lazy;
      return 'value';
    });
    token.lazy().resolve(new Container());
    expect(receivedLazy).toBe(true);
  });

  it('should pass the container as the first argument to the resolver', () => {
    const container = new Container();
    const token = new FunctionToken((c) => c);
    expect(token.resolve(container)).toBe(container);
  });
});
