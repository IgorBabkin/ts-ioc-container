import {
  EmptyContainer,
  type IContainer,
  type IContainerModule,
  MethodNotImplementedError,
  Provider,
  Registration,
} from '../../lib';

describe('EmptyContainer', () => {
  it('should raise an error when creating a scope', () => {
    expect(() => new EmptyContainer().createScope()).toThrowError(MethodNotImplementedError);
  });

  it('should raise an error when adding a module', () => {
    class MyModule implements IContainerModule {
      applyTo(container: IContainer) {
        container.register('key', Provider.fromValue(1));
      }
    }
    expect(() => new EmptyContainer().useModule(new MyModule())).toThrowError(MethodNotImplementedError);
  });

  it('should raise an error when disposing', () => {
    expect(() => new EmptyContainer().dispose()).toThrowError(MethodNotImplementedError);
  });

  it('should raise an error when registering a dependency', () => {
    expect(() => new EmptyContainer().register('hey', Provider.fromValue(1))).toThrowError(MethodNotImplementedError);
  });

  it('should raise an error when reading isDisposed', () => {
    expect(() => new EmptyContainer().isDisposed).toThrowError(MethodNotImplementedError);
  });

  it('should raise an error when checking for a tag', () => {
    expect(() => new EmptyContainer().hasTag('tag')).toThrowError(MethodNotImplementedError);
  });

  it('should raise an error when adding a registration', () => {
    expect(() => new EmptyContainer().addRegistration(Registration.fromValue(1))).toThrowError(
      MethodNotImplementedError,
    );
  });
});
