import { SingleAliasToken, Container, Registration, toSingleAlias } from '../../lib';

describe('SingleAliasToken', () => {
  it('should bind to alias via bindTo()', () => {
    const token = new SingleAliasToken<string>('myAlias');
    const registration = Registration.fromFn(() => 'value').bindToKey('myKey');
    token.bindTo(registration);

    const container = new Container().addRegistration(registration);
    expect(container.resolveOneByAlias('myAlias')).toBe('value');
  });

  it('should support toSingleAlias helper', () => {
    const token = toSingleAlias('myAlias');
    expect(token).toBeInstanceOf(SingleAliasToken);

    const container = new Container().addRegistration(
      Registration.fromFn(() => 'value')
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );
    expect(token.resolve(container)).toBe('value');
  });

  it('should support chaining args and argsFn preserving order', () => {
    const token = new SingleAliasToken<string>('myAlias');
    const container = new Container().addRegistration(
      Registration.fromFn((c, { args = [] }) => args.join('-'))
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );

    expect(
      token
        .args('a')
        .argsFn(() => ['b', 'c'])
        .resolve(container),
    ).toBe('a-b-c');
  });

  it('should forward runtime args ahead of chained args', () => {
    const token = new SingleAliasToken<string>('myAlias');
    const container = new Container().addRegistration(
      Registration.fromFn((c, { args = [] }) => args.join('-'))
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );

    expect(token.resolve(container, { args: ['r'] })).toBe('r');
    expect(token.args('a').resolve(container, { args: ['r'] })).toBe('r-a');
  });

  it('should expose the underlying alias via getKey()', () => {
    const token = new SingleAliasToken<string>('myAlias');
    expect(token.getKey()).toBe('myAlias');
  });
});
