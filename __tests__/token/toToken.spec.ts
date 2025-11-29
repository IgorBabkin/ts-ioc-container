import { ClassToken, Container, FunctionToken, SingleToken } from '../../lib';
import { toToken } from '../../lib/token/toToken';
import { UnsupportedTokenTypeError } from '../../lib/errors/UnsupportedTokenTypeError';
import type { IContainer } from '../../lib/container/IContainer';

describe('toToken', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container();
  });

  it('should return InjectionToken as-is', () => {
    const token = new SingleToken('key');
    const result = toToken(token);
    expect(result).toBe(token);
  });

  it('should convert DependencyKey to SingleToken', () => {
    const result = toToken('key');
    expect(result).toBeInstanceOf(SingleToken);
    expect((result as SingleToken).token).toBe('key');
  });

  it('should convert symbol DependencyKey to SingleToken', () => {
    const sym = Symbol('key');
    const result = toToken(sym);
    expect(result).toBeInstanceOf(SingleToken);
    expect((result as SingleToken).token).toBe(sym);
  });

  it('should convert constructor to ClassToken', () => {
    class TestClass {}
    const result = toToken(TestClass);
    expect(result).toBeInstanceOf(ClassToken);
  });

  it('should convert function to FunctionToken', () => {
    const fn = () => 'value';
    const result = toToken(fn);
    expect(result).toBeInstanceOf(FunctionToken);
    expect(result.resolve(container)).toBe('value');
  });

  it('should throw error for unsupported token type', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => toToken(null as any)).toThrow(UnsupportedTokenTypeError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => toToken(null as any)).toThrow('Unknown token null');
  });

  it('should throw error for object token', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => toToken({} as any)).toThrow(UnsupportedTokenTypeError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => toToken({} as any)).toThrow('Unknown token [object Object]');
  });
});
