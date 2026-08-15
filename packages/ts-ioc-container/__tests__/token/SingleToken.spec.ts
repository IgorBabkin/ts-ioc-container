import { SingleToken, Container, Registration } from '../../lib';

describe('SingleToken', () => {
  it('should bind to key via bindTo()', () => {
    const token = new SingleToken<string>('myKey');
    const registration = Registration.fromFn(() => 'value');
    token.bindTo(registration);

    const container = new Container().addRegistration(registration);
    expect(container.resolve('myKey')).toBe('value');
  });

  it('should support chaining args and argsFn preserving order', () => {
    const token = new SingleToken<string>('myKey');
    const container = new Container().addRegistration(
      Registration.fromFn((c, { args = [] }) => args.join('-')).bindToKey('myKey'),
    );

    expect(
      token
        .args('a')
        .argsFn(() => ['b', 'c'])
        .resolve(container),
    ).toBe('a-b-c');
  });

  it('should support select with args', () => {
    const token = new SingleToken<string>('myKey');
    const container = new Container().addRegistration(
      Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`).bindToKey('myKey'),
    );

    const selectFn = token.args('x', 'y').select((v) => v.toUpperCase());
    expect(selectFn(container)).toBe('VALUE-X-Y');
  });
});
