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

  it('should forward runtime args ahead of chained args', () => {
    const token = new SingleToken<string>('myKey');
    const container = new Container().addRegistration(
      Registration.fromFn((c, { args = [] }) => args.join('-')).bindToKey('myKey'),
    );

    expect(token.resolve(container, { args: ['r'] })).toBe('r');
    expect(token.args('a').resolve(container, { args: ['r'] })).toBe('r-a');
  });

  it('should expose the underlying key via toString()', () => {
    const token = new SingleToken<string>('myKey');
    expect(token.toString()).toBe('myKey');
  });

  it('should add tags immutably and preserve them through token methods', () => {
    const token = new SingleToken<string>('myKey');
    const tagged = token.addTags('request', 'admin');

    expect(token.hasTag('request')).toBe(false);
    expect(tagged.hasTag('request')).toBe(true);
    expect(tagged.hasTag('admin')).toBe(true);
    expect(tagged.args('value').hasTag('request')).toBe(true);
    expect(tagged.argsFn(() => []).hasTag('request')).toBe(true);
    expect(tagged.lazy().hasTag('request')).toBe(true);
    expect(tagged.addTags('request')).not.toBe(tagged);
  });
});
