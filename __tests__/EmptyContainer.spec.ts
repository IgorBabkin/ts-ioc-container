import {
  IContainer,
  MethodNotImplementedError,
  Provider,
  EmptyContainer,
  DependencyNotFoundError,
  type IRegistration,
  Registration,
  IContainerModule,
} from '../lib';

describe('EmptyContainer', () => {
  it('should raise an error when create a scope', () => {
    const container = new EmptyContainer();
    expect(() => container.createScope()).toThrowError(MethodNotImplementedError);
  });
  //
  it('should raise an error when add a module', () => {
    const container = new EmptyContainer();
    class MyModule implements IContainerModule {
      applyTo(container: IContainer) {
        container.register('key', Provider.fromValue(1));
      }
    }
    expect(() => container.use(new MyModule())).toThrowError(MethodNotImplementedError);
  });
  //
  it('should raise an error when dispose a container', () => {
    const container = new EmptyContainer();
    expect(() => container.dispose()).toThrowError(MethodNotImplementedError);
  });
  //
  it('should raise an error when register a dependency', () => {
    const container = new EmptyContainer();
    expect(() => container.register('hey', Provider.fromValue(1))).toThrowError(MethodNotImplementedError);
  });
  //
  it('should raise an error when getting isDisposed property', () => {
    const container = new EmptyContainer();
    expect(() => container.isDisposed).toThrowError(MethodNotImplementedError);
  });
  //
  it('should return undefined when getting parent', () => {
    const container = new EmptyContainer();
    expect(container.getParent()).toBeUndefined();
  });
  //
  it('should raise an error when checking for tag', () => {
    const container = new EmptyContainer();
    expect(() => container.hasTag('tag')).toThrowError(MethodNotImplementedError);
  });
  //
  it('should raise an error when adding registration', () => {
    const container = new EmptyContainer();
    expect(() => container.add(Registration.fromValue(1))).toThrowError(MethodNotImplementedError);
  });
  //
  // it('should raise an error when resolving a dependency', () => {
  //   const container = new EmptyContainer();
  //   expect(() => container.resolve('key', {})).toThrowError(DependencyNotFoundError);
  // });
  //
  // it('should raise an error when resolving one by alias', () => {
  //   const container = new EmptyContainer();
  //   expect(() => container.resolveOneByAlias(() => true)).toThrowError(DependencyNotFoundError);
  // });
  //
  it('should return false for hasProvider', () => {
    const container = new EmptyContainer();
    expect(container.hasProvider('key')).toBe(false);
  });
  //
  it('should return empty array for getScopes', () => {
    const container = new EmptyContainer();
    expect(container.getScopes()).toEqual([]);
  });
  //
  it('should return empty array for getInstances', () => {
    const container = new EmptyContainer();
    expect(container.getInstances()).toEqual([]);
  });
  //
  // it('should return empty array for getRegistrations', () => {
  //   const container = new EmptyContainer();
  //   expect(container.getRegistrations()).toEqual([]);
  // });
  //
  // it('should do nothing when removeScope is called', () => {
  //   const container = new EmptyContainer();
  //   expect(() => container.removeScope()).not.toThrow();
  // });
  //
  // it('should return the provided result map for resolveMany', () => {
  //   const container = new EmptyContainer();
  //   const resultMap = new Map();
  //   const result = container.resolveMany(() => true, {}, resultMap);
  //   expect(result).toBe(resultMap);
  // });
});
