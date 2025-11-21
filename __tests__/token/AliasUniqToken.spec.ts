import { AliasUniqToken, Container, Registration, toAliasUniq } from '../../lib';
import type { IContainer } from '../../lib/container/IContainer';

describe('AliasUniqToken', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container();
  });

  it('should resolve one by alias', () => {
    const token = new AliasUniqToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn(() => 'value')
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );

    const result = token.resolve(container);
    expect(result).toBe('value');
  });

  it('should support args method', () => {
    const token = new AliasUniqToken<string>('myAlias');
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
    const token = new AliasUniqToken<string>('myAlias');
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
    const token = new AliasUniqToken<string>('myAlias');
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
    const token = new AliasUniqToken<string>('myAlias');
    const lazyToken = token.lazy();
    expect(lazyToken).toBe(token);
  });

  it('should bind to alias', () => {
    const token = new AliasUniqToken<string>('myAlias');
    const registration = Registration.fromFn(() => 'value').bindToKey('myKey');
    token.bindTo(registration);

    container.addRegistration(registration);
    const result = container.resolveOneByAlias('myAlias');
    expect(result).toBe('value');
  });

  it('should support toAliasUniq helper', () => {
    const token = toAliasUniq('myAlias');
    expect(token).toBeInstanceOf(AliasUniqToken);
    container.addRegistration(
      Registration.fromFn(() => 'value')
        .bindToKey('myKey')
        .bindToAlias('myAlias'),
    );
    const result = token.resolve(container);
    expect(result).toBe('value');
  });
});
