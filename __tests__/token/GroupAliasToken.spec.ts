import { Container, GroupAliasToken, Registration, toGroupAlias } from '../../lib';

describe('GroupAliasToken', () => {
  it('should bind to alias via bindTo()', () => {
    const token = new GroupAliasToken<string>('myAlias');
    const registration = Registration.fromFn(() => 'value').bindToKey('myKey');
    token.bindTo(registration);

    const container = new Container().addRegistration(registration);
    expect(container.resolveByAlias('myAlias')).toEqual(['value']);
  });

  it('should support toGroupAlias helper', () => {
    const token = toGroupAlias('myAlias');
    expect(token).toBeInstanceOf(GroupAliasToken);

    const container = new Container().addRegistration(
      Registration.fromFn(() => 'value')
        .bindTo('myKey')
        .bindTo(token),
    );
    expect(token.resolve(container)).toEqual(['value']);
  });

  it('should support chaining args and argsFn preserving order', () => {
    const token = new GroupAliasToken<string>('myAlias');
    const container = new Container().addRegistration(
      Registration.fromFn((c, { args = [] }) => args.join('-'))
        .bindTo('myKey')
        .bindTo(token),
    );

    expect(
      token
        .args('a')
        .argsFn(() => ['b', 'c'])
        .resolve(container),
    ).toEqual(['a-b-c']);
  });
});
