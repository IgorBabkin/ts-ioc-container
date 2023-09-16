import { EmptyContainer } from '../lib/container/EmptyContainer';
import { IContainer, MethodNotImplementedError, Provider } from '../lib';

describe('EmptyContainer', function () {
  it('should raise an error when create a scope', function () {
    const container = new EmptyContainer();
    expect(() => container.createScope()).toThrowError(MethodNotImplementedError);
  });

  it('should raise an error when add a module', function () {
    const container = new EmptyContainer();
    expect(() =>
      container.use({
        applyTo(container: IContainer) {},
      }),
    ).toThrowError(MethodNotImplementedError);
  });

  it('should raise an error when dispose a container', function () {
    const container = new EmptyContainer();
    expect(() => container.dispose()).toThrowError(MethodNotImplementedError);
  });

  it('should raise an error when register a dependency', function () {
    const container = new EmptyContainer();
    expect(() => container.register('hey', Provider.fromValue(1))).toThrowError(MethodNotImplementedError);
  });
});
