import { Container, GroupInstanceToken, MethodNotImplementedError } from '../../lib';

describe('GroupInstanceToken', () => {
  class ServiceA {}
  class ServiceB {}

  it('should resolve instances matching predicate', () => {
    const container = new Container();
    const token = new GroupInstanceToken((dep) => dep instanceof ServiceA);
    container.resolve(ServiceA);
    container.resolve(ServiceB);
    container.resolve(ServiceA);

    const result = token.resolve(container);
    expect(result).toHaveLength(2);
    expect(result.every((dep) => dep instanceof ServiceA)).toBe(true);
  });

  it('should support cascade(false) to restrict to current scope only', () => {
    const container = new Container();
    const child = container.createScope();
    child.resolve(ServiceA);

    const token = new GroupInstanceToken(() => true);

    expect(token.resolve(container).length).toBeGreaterThanOrEqual(1);

    token.cascade(false);
    expect(token.resolve(container)).toHaveLength(0);
  });

  it('should throw MethodNotImplementedError on args, argsFn, and lazy', () => {
    const token = new GroupInstanceToken(() => true);
    expect(() => token.args('arg1')).toThrow(MethodNotImplementedError);
    expect(() => token.argsFn(() => [])).toThrow(MethodNotImplementedError);
    expect(() => token.lazy()).toThrow(MethodNotImplementedError);
  });

  it('should support select method', () => {
    const container = new Container();
    const token = new GroupInstanceToken((dep) => dep instanceof ServiceA);
    container.resolve(ServiceA);
    container.resolve(ServiceB);

    const result = token.select((instance) => instance.constructor.name)(container);
    expect(result).toEqual(['ServiceA']);
  });
});
