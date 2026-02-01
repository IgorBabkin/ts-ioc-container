import { SingleToken, Container, Registration } from '../../lib';
import type { IContainer } from '../../lib/container/IContainer';

describe('SingleToken', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container();
  });

  it('should resolve by key', () => {
    const token = new SingleToken<string>('myKey');
    container.addRegistration(Registration.fromFn(() => 'value').bindToKey('myKey'));

    const result = token.resolve(container);
    expect(result).toBe('value');
  });

  it('should support args method', () => {
    const token = new SingleToken<string>('myKey');
    container.addRegistration(Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`).bindToKey('myKey'));

    const tokenWithArgs = token.args('arg1', 'arg2');
    const result = tokenWithArgs.resolve(container);
    expect(result).toBe('value-arg1-arg2');
  });

  it('should support argsFn method', () => {
    const token = new SingleToken<string>('myKey');
    container.addRegistration(Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`).bindToKey('myKey'));

    const tokenWithArgs = token.argsFn(() => ['from', 'fn']);
    const result = tokenWithArgs.resolve(container);
    expect(result).toBe('value-from-fn');
  });

  it('should support chaining args and argsFn', () => {
    const token = new SingleToken<string>('myKey');
    container.addRegistration(Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`).bindToKey('myKey'));

    const tokenWithArgs = token.args('arg1').argsFn(() => ['from', 'fn']);
    const result = tokenWithArgs.resolve(container);
    expect(result).toBe('value-arg1-from-fn');
  });

  it('should support lazy method', () => {
    const token = new SingleToken<string>('myKey');
    const lazyToken = token.lazy();
    expect(lazyToken).not.toBe(token);
    expect(lazyToken).toBeInstanceOf(SingleToken);
  });

  it('should bind to key', () => {
    const token = new SingleToken<string>('myKey');
    const registration = Registration.fromFn(() => 'value');
    token.bindTo(registration);

    container.addRegistration(registration);
    const result = container.resolve('myKey');
    expect(result).toBe('value');
  });

  it('should support select method', () => {
    const token = new SingleToken<string>('myKey');
    container.addRegistration(Registration.fromFn(() => 'value').bindToKey('myKey'));

    const selectFn = token.select((value) => value.toUpperCase());
    const result = selectFn(container);
    expect(result).toBe('VALUE');
  });

  it('should support select method with args', () => {
    const token = new SingleToken<string>('myKey');
    container.addRegistration(Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`).bindToKey('myKey'));

    const tokenWithArgs = token.args('arg1', 'arg2');
    const selectFn = tokenWithArgs.select((value) => value.toUpperCase());
    const result = selectFn(container);
    expect(result).toBe('VALUE-ARG1-ARG2');
  });
});
