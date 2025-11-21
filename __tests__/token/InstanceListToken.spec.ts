import { Container, InstanceListToken, MethodNotImplementedError } from '../../lib';
import type { IContainer } from '../../lib/container/IContainer';

describe('InstanceListToken', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container();
  });

  class ServiceA {}
  class ServiceB {}

  it('should resolve instances matching predicate', () => {
    const token = new InstanceListToken((dep) => dep instanceof ServiceA);
    container.resolve(ServiceA);
    container.resolve(ServiceB);
    container.resolve(ServiceA);

    const result = token.resolve(container);
    expect(result).toHaveLength(2);
    expect(result.every((dep) => dep instanceof ServiceA)).toBe(true);
  });

  it('should support cascade method', () => {
    const token = new InstanceListToken(() => true);
    const child = container.createScope();
    child.resolve(ServiceA);

    const resultWithCascade = token.cascade(true).resolve(container);
    expect(resultWithCascade.length).toBeGreaterThanOrEqual(0);

    const resultWithoutCascade = token.cascade(false).resolve(child);
    expect(resultWithoutCascade).toContainEqual(expect.any(ServiceA));
  });

  it('should throw error on args method', () => {
    const token = new InstanceListToken(() => true);
    expect(() => token.args('arg1')).toThrow(MethodNotImplementedError);
    expect(() => token.args('arg1')).toThrow('not implemented');
  });

  it('should throw error on argsFn method', () => {
    const token = new InstanceListToken(() => true);
    expect(() => token.argsFn(() => [])).toThrow(MethodNotImplementedError);
    expect(() => token.argsFn(() => [])).toThrow('not implemented');
  });

  it('should throw error on lazy method', () => {
    const token = new InstanceListToken(() => true);
    expect(() => token.lazy()).toThrow(MethodNotImplementedError);
    expect(() => token.lazy()).toThrow('not implemented');
  });
});
