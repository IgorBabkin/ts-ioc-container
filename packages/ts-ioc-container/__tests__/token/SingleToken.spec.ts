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

  it('should compose a namespace name out of the module path and the key', () => {
    const token = new SingleToken<string>('ILogger', { namespace: '/app/src/domain/user/' });

    expect(token.getNamespace()).toBe('/app/src/domain/user/ILogger');
    expect(new SingleToken<string>('ILogger').getNamespace()).toBeUndefined();
  });

  it('should return a new token from namespace(), leaving the parent untouched', () => {
    const token = new SingleToken<string>('ILogger');
    const domainToken = token.namespace('/app/domain');
    const infraToken = token.namespace('/app/infra');

    expect(token.getNamespace()).toBeUndefined();
    expect(domainToken.getNamespace()).toBe('/app/domain/ILogger');
    expect(infraToken.getNamespace()).toBe('/app/infra/ILogger');
  });

  it('should keep the namespace across args, argsFn and lazy chaining', () => {
    const token = new SingleToken<string>('ILogger').namespace('/app/domain');

    expect(token.args('a').getNamespace()).toBe('/app/domain/ILogger');
    expect(token.argsFn(() => ['a']).getNamespace()).toBe('/app/domain/ILogger');
    expect(token.lazy().getNamespace()).toBe('/app/domain/ILogger');
  });

  it('should pass its namespace to the resolving provider', () => {
    const container = new Container().addRegistration(
      Registration.fromFn((c, { namespace }) => namespace ?? 'none').bindToKey('ILogger'),
    );

    expect(new SingleToken<string>('ILogger').namespace('/app/domain').resolve(container)).toBe('/app/domain/ILogger');
    expect(new SingleToken<string>('ILogger').resolve(container)).toBe('none');
    // A token without a namespace of its own inherits the one it is resolved under
    expect(new SingleToken<string>('ILogger').resolve(container, { namespace: '/app/infra/ILogger' })).toBe(
      '/app/infra/ILogger',
    );
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
