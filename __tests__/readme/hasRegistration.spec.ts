import { Container, Registration as R, bindTo, register, SingleToken } from '../../lib';

/**
 * Container Registration Checking - hasRegistration
 *
 * The `hasRegistration` method allows you to check if a registration with a specific key
 * exists in the current container. This is useful for conditional registration logic,
 * validation, and debugging.
 *
 * Key points:
 * - Checks only the current container's registrations (not parent containers)
 * - Works with string keys, symbol keys, and token keys
 * - Returns false after container disposal
 * - Useful for conditional registration patterns
 */
describe('hasRegistration', function () {
  const createAppContainer = () => new Container({ tags: ['application'] });

  it('should return true when registration exists with string key', function () {
    const container = createAppContainer();
    container.addRegistration(R.fromValue('production').bindToKey('Environment'));

    expect(container.hasRegistration('Environment')).toBe(true);
  });

  it('should return false when registration does not exist', function () {
    const container = createAppContainer();

    expect(container.hasRegistration('NonExistentService')).toBe(false);
  });

  it('should work with symbol keys', function () {
    const container = createAppContainer();
    const serviceKey = Symbol('IService');
    container.addRegistration(R.fromValue({ name: 'Service' }).bindToKey(serviceKey));

    expect(container.hasRegistration(serviceKey)).toBe(true);
  });

  it('should work with token keys', function () {
    const container = createAppContainer();
    const loggerToken = new SingleToken<{ log: (msg: string) => void }>('ILogger');
    container.addRegistration(R.fromValue({ log: () => {} }).bindTo(loggerToken));

    expect(container.hasRegistration(loggerToken)).toBe(true);
  });

  it('should only check current container, not parent registrations', function () {
    // Parent container has a registration
    const parent = createAppContainer();
    parent.addRegistration(R.fromValue('parent-config').bindToKey('Config'));

    // Child scope does not have the registration
    const child = parent.createScope();
    child.addRegistration(R.fromValue('child-service').bindToKey('Service'));

    // Child should not see parent's registration
    expect(child.hasRegistration('Config')).toBe(false);
    // But child should see its own registration
    expect(child.hasRegistration('Service')).toBe(true);
    // Parent should see its own registration
    expect(parent.hasRegistration('Config')).toBe(true);
  });

  it('should work with class-based registrations', function () {
    @register(bindTo('ILogger'))
    class Logger {}

    const container = createAppContainer();
    container.addRegistration(R.fromClass(Logger));

    expect(container.hasRegistration('ILogger')).toBe(true);
  });

  it('should be useful for conditional registration patterns', function () {
    const container = createAppContainer();

    // Register a base service
    container.addRegistration(R.fromValue('base-service').bindToKey('BaseService'));

    // Conditionally register an extension only if base exists
    if (container.hasRegistration('BaseService')) {
      container.addRegistration(R.fromValue('extension-service').bindToKey('ExtensionService'));
    }

    expect(container.hasRegistration('BaseService')).toBe(true);
    expect(container.hasRegistration('ExtensionService')).toBe(true);
  });
});
