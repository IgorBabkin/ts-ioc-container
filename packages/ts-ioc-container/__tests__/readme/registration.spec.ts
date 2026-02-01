import {
  bindTo,
  Container,
  DependencyMissingKeyError,
  register,
  Registration as R,
  scope,
  select as s,
  singleton,
} from '../../lib';

/**
 * User Management Domain - Registration Patterns
 *
 * Registrations define how dependencies are bound to the container.
 * Common patterns:
 * - Register by class (auto-generates key from class name)
 * - Register by value (constants, configuration)
 * - Register by factory function (dynamic creation)
 * - Register with aliases (multiple keys for same service)
 *
 * This is the foundation for dependency injection - telling the container
 * "when someone asks for X, give them Y".
 */
describe('Registration module', function () {
  const createAppContainer = () => new Container({ tags: ['application'] });

  it('should register class with scope and lifecycle', function () {
    // Logger is registered at application scope as a singleton
    @register(bindTo('ILogger'), scope((s) => s.hasTag('application')), singleton())
    class Logger {}

    const appContainer = createAppContainer().addRegistration(R.fromClass(Logger));

    expect(appContainer.resolve('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register configuration value', function () {
    // Register application configuration as a value
    const appContainer = createAppContainer().addRegistration(R.fromValue('production').bindToKey('Environment'));

    expect(appContainer.resolve('Environment')).toBe('production');
  });

  it('should register factory function', function () {
    // Factory functions are useful for dynamic creation
    const appContainer = createAppContainer().addRegistration(
      R.fromFn(() => `app-${Date.now()}`).bindToKey('RequestId'),
    );

    expect(appContainer.resolve('RequestId')).toContain('app-');
  });

  it('should raise an error if binding key is not provided', () => {
    // Values and functions must have explicit keys (classes use class name by default)
    expect(() => {
      createAppContainer().addRegistration(R.fromValue('orphan-value'));
    }).toThrowError(DependencyMissingKeyError);
  });

  it('should register dependency by class name when no key decorator is used', function () {
    // Without @register(bindTo('key')), the class name becomes the key
    class FileLogger {}

    const appContainer = createAppContainer().addRegistration(R.fromClass(FileLogger));

    expect(appContainer.resolve('FileLogger')).toBeInstanceOf(FileLogger);
  });

  it('should register with multiple keys using aliases', function () {
    // Same service accessible via direct key and alias
    @register(bindTo('ILogger'), bindTo(s.alias('Logger')), singleton())
    class Logger {}

    const appContainer = createAppContainer().addRegistration(R.fromClass(Logger));

    // Accessible via alias (for group resolution)
    expect(appContainer.resolveByAlias('Logger')[0]).toBeInstanceOf(Logger);
    // Accessible via direct key
    expect(appContainer.resolve('ILogger')).toBeInstanceOf(Logger);
  });
});
