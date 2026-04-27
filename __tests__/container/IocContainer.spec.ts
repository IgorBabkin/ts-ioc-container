import { args, setArgs, bindTo, Container, inject, register, Registration as R, scope } from '../../lib';

@register(bindTo('logger'))
class Logger {
  constructor(@inject(args(0)) public topic: string) {}
}

describe('IocContainer', function () {
  it('should keep argument for provider', function () {
    const container = new Container().addRegistration(R.fromClass(Logger).pipe(setArgs('main')));

    expect(container.resolve<Logger>('logger').topic).toBe('main');
  });

  describe('addTags', () => {
    it('should add a single tag to container', () => {
      const container = new Container();

      expect(container.hasTag('production')).toBe(false);

      container.addTags('production');

      expect(container.hasTag('production')).toBe(true);
    });

    it('should add multiple tags at once', () => {
      const container = new Container();

      container.addTags('production', 'api', 'v2');

      expect(container.hasTag('production')).toBe(true);
      expect(container.hasTag('api')).toBe(true);
      expect(container.hasTag('v2')).toBe(true);
    });

    it('should add tags incrementally without removing previous ones', () => {
      const container = new Container();

      container.addTags('development');
      container.addTags('debug');

      expect(container.hasTag('development')).toBe(true);
      expect(container.hasTag('debug')).toBe(true);
    });

    it('should handle duplicate tags without error', () => {
      const container = new Container();

      container.addTags('production');
      container.addTags('production');

      expect(container.hasTag('production')).toBe(true);
    });

    it('should affect scope matching when tags are added before registration', () => {
      @register(bindTo('service'), scope((s) => s.hasTag('production')))
      class ProductionService {}

      const container = new Container();
      container.addTags('production');
      container.addRegistration(R.fromClass(ProductionService));

      expect(container.resolve('service')).toBeInstanceOf(ProductionService);
    });

    it('should affect child scope creation based on added tags', () => {
      @register(bindTo('service'), scope((s) => s.hasTag('api')))
      class ApiService {}

      const container = new Container();
      container.addTags('api');
      container.addRegistration(R.fromClass(ApiService));

      const childScope = container.createScope({ tags: ['request'] });

      expect(container.resolve('service')).toBeInstanceOf(ApiService);
      expect(childScope.resolve('service')).toBeInstanceOf(ApiService);
    });

    it('should allow conditional tag addition for environment-based configuration', () => {
      @register(bindTo('logger'), scope((s) => s.hasTag('development')))
      class ConsoleLogger {}

      @register(bindTo('logger'), scope((s) => s.hasTag('production')))
      class FileLogger {}

      const container = new Container();
      container.addTags('development');
      container.addRegistration(R.fromClass(ConsoleLogger)).addRegistration(R.fromClass(FileLogger));

      expect(container.resolve('logger')).toBeInstanceOf(ConsoleLogger);
    });
  });

  describe('hasRegistration', () => {
    it('should return true when registration exists with string key', () => {
      const container = new Container();
      container.addRegistration(R.fromValue('test-value').bindToKey('testKey'));

      expect(container.hasRegistration('testKey')).toBe(true);
    });

    it('should return false when registration does not exist', () => {
      const container = new Container();

      expect(container.hasRegistration('nonExistentKey')).toBe(false);
    });

    it('should return true when registration exists with symbol key', () => {
      const container = new Container();
      const symbolKey = Symbol('testSymbol');
      container.addRegistration(R.fromValue('test-value').bindToKey(symbolKey));

      expect(container.hasRegistration(symbolKey)).toBe(true);
    });

    it('should return false for different key even if registration exists', () => {
      const container = new Container();
      container.addRegistration(R.fromValue('test-value').bindToKey('key1'));

      expect(container.hasRegistration('key2')).toBe(false);
    });

    it('should return true for multiple registrations with different keys', () => {
      const container = new Container();
      container
        .addRegistration(R.fromValue('value1').bindToKey('key1'))
        .addRegistration(R.fromValue('value2').bindToKey('key2'));

      expect(container.hasRegistration('key1')).toBe(true);
      expect(container.hasRegistration('key2')).toBe(true);
    });

    it('should return false after container is disposed', () => {
      const container = new Container();
      container.addRegistration(R.fromValue('test-value').bindToKey('testKey'));

      container.dispose();

      expect(container.hasRegistration('testKey')).toBe(false);
    });

    it('should work with class-based registrations using explicit key', () => {
      @register(bindTo('IService'))
      class TestService {}

      const container = new Container();
      container.addRegistration(R.fromClass(TestService));

      expect(container.hasRegistration('IService')).toBe(true);
      expect(container.hasRegistration('TestService')).toBe(false);
    });
  });
});
