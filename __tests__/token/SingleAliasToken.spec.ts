import { SingleAliasToken, Container, Registration, toSingleAlias } from '../../lib';
import type { IContainer } from '../../lib/container/IContainer';

describe('SingleAliasToken', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container();
  });

  it('should resolve one by alias', () => {
    const token = new SingleAliasToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn(() => 'value')
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );

    const result = token.resolve(container);
    expect(result).toBe('value');
  });

  it('should support args method', () => {
    const token = new SingleAliasToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`)
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );

    const tokenWithArgs = token.args('arg1', 'arg2');
    const result = tokenWithArgs.resolve(container);
    expect(result).toBe('value-arg1-arg2');
  });

  it('should support argsFn method', () => {
    const token = new SingleAliasToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`)
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );

    const tokenWithArgs = token.argsFn(() => ['from', 'fn']);
    const result = tokenWithArgs.resolve(container);
    expect(result).toBe('value-from-fn');
  });

  it('should support chaining args and argsFn', () => {
    const token = new SingleAliasToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`)
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );

    const tokenWithArgs = token.args('arg1').argsFn(() => ['from', 'fn']);
    const result = tokenWithArgs.resolve(container);
    expect(result).toBe('value-arg1-from-fn');
  });

  it('should support lazy method', () => {
    const token = new SingleAliasToken<string>('myAlias');
    const lazyToken = token.lazy();
    expect(lazyToken).not.toBe(token);
    expect(lazyToken).toBeInstanceOf(SingleAliasToken);
  });

  it('should bind to alias', () => {
    const token = new SingleAliasToken<string>('myAlias');
    const registration = Registration.fromFn(() => 'value').bindToKey('myKey');
    token.bindTo(registration);

    container.addRegistration(registration);
    const result = container.resolveOneByAlias('myAlias');
    expect(result).toBe('value');
  });

  it('should support toSingleAlias helper', () => {
    const token = toSingleAlias('myAlias');
    expect(token).toBeInstanceOf(SingleAliasToken);
    container.addRegistration(
      Registration.fromFn(() => 'value')
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );
    const result = token.resolve(container);
    expect(result).toBe('value');
  });
});
