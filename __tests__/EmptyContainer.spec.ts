import {
  IContainer,
  MethodNotImplementedError,
  Provider,
  EmptyContainer,
  DependencyNotFoundError,
  IRegistration,
} from '../lib';

describe('EmptyContainer', () => {
  it('should raise an error when create a scope', () => {
    const container = new EmptyContainer();
    expect(() => container.createScope()).toThrow(MethodNotImplementedError);
  });

  it('should raise an error when add a module', () => {
    const container = new EmptyContainer();
    expect(() =>
      container.use({
        applyTo: (container: IContainer) => {},
      }),
    ).toThrow(MethodNotImplementedError);
  });

  it('should raise an error when dispose a container', () => {
    const container = new EmptyContainer();
    expect(() => container.dispose()).toThrow(MethodNotImplementedError);
  });

  it('should raise an error when register a dependency', () => {
    const container = new EmptyContainer();
    expect(() => container.register('hey', Provider.fromValue(1))).toThrow(MethodNotImplementedError);
  });

  it('should raise an error when trying to get isDisposed property', () => {
    const container = new EmptyContainer();
    expect(() => container.isDisposed).toThrow(MethodNotImplementedError);
  });

  it('should return false from hasProvider', () => {
    const container = new EmptyContainer();
    expect(container.hasProvider('someKey')).toBe(false);
  });

  it('should return undefined from getParent', () => {
    const container = new EmptyContainer();
    expect(container.getParent()).toBeUndefined();
  });

  it('should return empty array from getScopes', () => {
    const container = new EmptyContainer();
    expect(container.getScopes()).toEqual([]);
  });

  it('should return empty array from getInstances', () => {
    const container = new EmptyContainer();
    expect(container.getInstances()).toEqual([]);
  });

  it('should return false from hasTag', () => {
    const container = new EmptyContainer();
    expect(container.hasTag('someTag')).toBe(false);
  });

  it('should not throw from removeScope', () => {
    const container = new EmptyContainer();
    expect(() => container.removeScope()).not.toThrow();
  });

  it('should not throw from detach', () => {
    const container = new EmptyContainer();
    expect(() => container.detach()).not.toThrow();
  });

  it('should return itself from add method', () => {
    const container = new EmptyContainer();
    const mockRegistration = {} as IRegistration;
    expect(container.add(mockRegistration)).toBe(container);
  });

  it('should return empty array from getRegistrations', () => {
    const container = new EmptyContainer();
    expect(container.getRegistrations()).toEqual([]);
  });

  it('should return empty map from resolveManyByAlias', () => {
    const container = new EmptyContainer();
    const result = container.resolveManyByAlias(() => true);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('should throw DependencyNotFoundError from resolveOneByAlias', () => {
    const container = new EmptyContainer();
    expect(() => container.resolveOneByAlias(() => true)).toThrow(DependencyNotFoundError);
  });

  it('should throw DependencyNotFoundError when trying to resolve a dependency', () => {
    const container = new EmptyContainer();
    expect(() => container.resolve('nonExistentKey', {})).toThrow(DependencyNotFoundError);
  });
});
