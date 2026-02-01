import { Container, GroupAliasToken, type IContainer, Registration, toGroupAlias } from '../../lib';

describe('GroupAliasToken', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container();
  });

  it('should resolve by alias', () => {
    const token = new GroupAliasToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn(() => 'value')
        .bindTo('myKey')
        .bindTo(token),
    );

    const result = token.resolve(container);
    expect(result).toEqual(['value']);
  });

  it('should support args method', () => {
    const token = new GroupAliasToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`)
        .bindTo('myKey')
        .bindTo(token),
    );

    const tokenWithArgs = token.args('arg1', 'arg2');
    const result = tokenWithArgs.resolve(container);
    expect(result).toEqual(['value-arg1-arg2']);
  });

  it('should support argsFn method', () => {
    const token = new GroupAliasToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`)
        .bindTo('myKey')
        .bindTo(token),
    );

    const tokenWithArgs = token.argsFn(() => ['from', 'fn']);
    const result = tokenWithArgs.resolve(container);
    expect(result).toEqual(['value-from-fn']);
  });

  it('should support chaining args and argsFn', () => {
    const token = new GroupAliasToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`)
        .bindTo('myKey')
        .bindTo(token),
    );

    const tokenWithArgs = token.args('arg1').argsFn(() => ['from', 'fn']);
    const result = tokenWithArgs.resolve(container);
    expect(result).toEqual(['value-arg1-from-fn']);
  });

  it('should support lazy method', () => {
    const token = new GroupAliasToken<string>('myAlias');
    const lazyToken = token.lazy();
    expect(lazyToken).not.toBe(token);
    expect(lazyToken).toBeInstanceOf(GroupAliasToken);
  });

  it('should bind to alias', () => {
    const token = new GroupAliasToken<string>('myAlias');
    const registration = Registration.fromFn(() => 'value').bindToKey('myKey');
    token.bindTo(registration);

    container.addRegistration(registration);
    const result = container.resolveByAlias('myAlias');
    expect(result).toEqual(['value']);
  });

  it('should support toGroupAlias helper', () => {
    const token = toGroupAlias('myAlias');
    expect(token).toBeInstanceOf(GroupAliasToken);
    container.addRegistration(
      Registration.fromFn(() => 'value')
        .bindTo('myKey')
        .bindTo(token),
    );
    const result = token.resolve(container);
    expect(result).toEqual(['value']);
  });

  it('should support select method', () => {
    const token = new GroupAliasToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn(() => 'value1')
        .bindTo('myKey1')
        .bindTo(token),
    );
    container.addRegistration(
      Registration.fromFn(() => 'value2')
        .bindTo('myKey2')
        .bindTo(token),
    );

    const selectFn = token.select((values) => values.map((v) => v.toUpperCase()));
    const result = selectFn(container);
    expect(result).toEqual(['VALUE1', 'VALUE2']);
  });

  it('should support select method with args', () => {
    const token = new GroupAliasToken<string>('myAlias');
    container.addRegistration(
      Registration.fromFn((c, { args = [] }) => `value-${args.join('-')}`)
        .bindTo('myKey')
        .bindTo(token),
    );

    const tokenWithArgs = token.args('arg1', 'arg2');
    const selectFn = tokenWithArgs.select((values) => values.map((v) => v.toUpperCase()));
    const result = selectFn(container);
    expect(result).toEqual(['VALUE-ARG1-ARG2']);
  });
});
