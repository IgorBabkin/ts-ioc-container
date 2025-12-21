import {
  args,
  bindTo,
  Container,
  ContainerDisposedError,
  DependencyNotFoundError,
  register,
  Registration as R,
  scope,
  select,
  singleton,
} from '../../lib';

@register(bindTo('logger'))
class Logger {
  constructor(public topic: string) {}
}

describe('IocContainer', function () {
  function createContainer() {
    return new Container();
  }

  it('should resolve dependency', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));

    expect(container.resolve('logger')).toBeInstanceOf(Logger);
  });

  it('should resolve unique dependency per every request', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));

    expect(container.resolve('logger')).not.toBe(container.resolve('logger'));
  });

  it('should register provider as constructor name if key is not provided', function () {
    class TestClass {}

    const container = createContainer();
    container.addRegistration(R.fromClass(TestClass));

    expect(container.resolve('TestClass')).toBeInstanceOf(TestClass);
  });

  it('should keep all instances', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));

    const logger = container.resolve<Logger>('logger');

    expect(select.instances().resolve(container)).toContain(logger);
  });

  it('should dispose all instances', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));

    container.resolve('logger');
    container.dispose();

    expect(select.instances().resolve(container).length).toBe(0);
  });

  it('should throw an error if provider is not registered', function () {
    const container = createContainer();

    expect(() => container.resolve('logger')).toThrowError(DependencyNotFoundError);
  });

  it('should throw an error when trying to resolve a dependency of disposed container', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));

    container.dispose();

    expect(() => container.resolve('logger')).toThrowError(ContainerDisposedError);
  });

  it('should throw an error when trying to register a provider of disposed container', function () {
    const container = createContainer();

    container.dispose();

    expect(() => container.addRegistration(R.fromClass(Logger))).toThrowError(ContainerDisposedError);
  });

  it('should keep argument for provider', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger).pipe(args('main')));

    expect(container.resolve<Logger>('logger').topic).toBe('main');
  });

  it('should use builder decorators', function () {
    @register(singleton())
    class Logger1 {}

    const container = createContainer().addRegistration(R.fromClass(Logger1).bindToKey('logger'));

    expect(container.resolve('logger')).toBe(container.resolve('logger'));
  });

  describe('addTags', () => {
    it('should add a single tag to container', () => {
      const container = createContainer();

      expect(container.hasTag('production')).toBe(false);

      container.addTags('production');

      expect(container.hasTag('production')).toBe(true);
    });

    it('should add multiple tags at once', () => {
      const container = createContainer();

      container.addTags('production', 'api', 'v2');

      expect(container.hasTag('production')).toBe(true);
      expect(container.hasTag('api')).toBe(true);
      expect(container.hasTag('v2')).toBe(true);
    });

    it('should add tags incrementally', () => {
      const container = createContainer();

      container.addTags('development');
      expect(container.hasTag('development')).toBe(true);

      container.addTags('debug');
      expect(container.hasTag('development')).toBe(true);
      expect(container.hasTag('debug')).toBe(true);
    });

    it('should handle duplicate tags without error', () => {
      const container = createContainer();

      container.addTags('production');
      container.addTags('production');

      expect(container.hasTag('production')).toBe(true);
    });

    it('should work with scope matching when tags are added before registration', () => {
      @register(bindTo('service'), scope((s) => s.hasTag('production')))
      class ProductionService {}

      const container = createContainer();

      // Add the tag before registration
      container.addTags('production');

      // Now add the registration - it should match the scope
      container.addRegistration(R.fromClass(ProductionService));

      // Service should be available
      expect(container.resolve('service')).toBeInstanceOf(ProductionService);
    });

    it('should affect child scope creation based on added tags', () => {
      @register(bindTo('service'), scope((s) => s.hasTag('api')))
      class ApiService {}

      const container = createContainer();

      // Add tag to parent container
      container.addTags('api');
      container.addRegistration(R.fromClass(ApiService));

      // Create child scope - should inherit the registration because parent has 'api' tag
      const childScope = container.createScope({ tags: ['request'] });

      expect(container.resolve('service')).toBeInstanceOf(ApiService);
      expect(childScope.resolve('service')).toBeInstanceOf(ApiService);
    });

    it('should allow conditional tag addition for environment-based configuration', () => {
      @register(bindTo('logger'), scope((s) => s.hasTag('development')))
      class ConsoleLogger {}

      @register(bindTo('logger'), scope((s) => s.hasTag('production')))
      class FileLogger {}

      const container = createContainer();

      // Simulate environment-based tag addition
      const environment = 'development';
      container.addTags(environment);

      // Add registrations after tag is set
      container.addRegistration(R.fromClass(ConsoleLogger)).addRegistration(R.fromClass(FileLogger));

      expect(container.resolve('logger')).toBeInstanceOf(ConsoleLogger);
    });
  });
});
