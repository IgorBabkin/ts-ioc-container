import { AliasToken, Container, Registration } from '../../lib';
import { toAlias } from '../../lib/token/AliasToken';
import type { IContainer } from '../../lib/container/IContainer';

describe('AliasToken', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container();
  });

  it('should resolve by alias', () => {
    const token = new AliasToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn(() => 'value')
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );

    const result = token.resolve(container);
    expect(result).toEqual(['value']);
  });

  it('should support args method', () => {
    const token = new AliasToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`)
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );

    const tokenWithArgs = token.args('arg1', 'arg2');
    const result = tokenWithArgs.resolve(container);
    expect(result).toEqual(['value-arg1-arg2']);
  });

  it('should support argsFn method', () => {
    const token = new AliasToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`)
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );

    const tokenWithArgs = token.argsFn(() => ['from', 'fn']);
    const result = tokenWithArgs.resolve(container);
    expect(result).toEqual(['value-from-fn']);
  });

  it('should support chaining args and argsFn', () => {
    const token = new AliasToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`)
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );

    const tokenWithArgs = token.args('arg1').argsFn(() => ['from', 'fn']);
    const result = tokenWithArgs.resolve(container);
    expect(result).toEqual(['value-arg1-from-fn']);
  });

  it('should support lazy method', () => {
    const token = new AliasToken<string>('myAlias');
    const lazyToken = token.lazy();
    expect(lazyToken).toBe(token);
  });

  it('should bind to alias', () => {
    const token = new AliasToken<string>('myAlias');
    const registration = Registration.fromFn(() => 'value').bindToKey('myKey');
    token.bindTo(registration);

    container.addRegistration(registration);
    const result = container.resolveByAlias('myAlias');
    expect(result).toEqual(['value']);
  });

  it('should support toAlias helper', () => {
    const token = toAlias('myAlias');
    expect(token).toBeInstanceOf(AliasToken);
    container.addRegistration(
      Registration.fromFn(() => 'value')
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );
    const result = token.resolve(container);
    expect(result).toEqual(['value']);
  });
});
