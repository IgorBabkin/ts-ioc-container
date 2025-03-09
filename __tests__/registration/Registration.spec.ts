import 'reflect-metadata';
import { IContainer } from '../../lib/container/IContainer';
import { Container } from '../../lib/container/Container';
import { SimpleInjector } from '../../lib/injector/SimpleInjector';
import { Registration } from '../../lib/registration/Registration';
import { Provider } from '../../lib/provider/Provider';
import { DependencyMissingKeyError } from '../../lib/errors/DependencyMissingKeyError';

describe('Registration', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container(new SimpleInjector());
  });

  describe('static methods', () => {
    it('should create registration from class', () => {
      // Create a class with transformers
      class TestClass {
        getValue() {
          return 'class-value';
        }
      }

      // Add transformers
      const transformer = jest.fn((r) => r);
      Reflect.defineMetadata('registration', [transformer], TestClass);

      // Create a registration from the class
      const registration = Registration.toClass(TestClass);

      // Verify transformer was called
      expect(transformer).toHaveBeenCalled();

      // Add to container and resolve
      container.add(registration);
      const instance = container.resolve(TestClass);
      expect(instance).toBeInstanceOf(TestClass);
      expect(instance.getValue()).toBe('class-value');
    });

    it('should create registration from constructor value', () => {
      // Create a class with transformers
      class TestClass {
        getValue() {
          return 'class-value';
        }
      }

      // Add transformers
      const transformer = jest.fn((r) => r);
      Reflect.defineMetadata('registration', [transformer], TestClass);

      // Create a registration from the class as a value
      const registration = Registration.toValue(TestClass);

      // Verify transformer was called
      expect(transformer).toHaveBeenCalled();

      // Add to container and resolve
      container.add(registration);
      const result = container.resolve(TestClass.name);
      expect(result).toBe(TestClass); // Should be the class itself, not an instance
    });

    it('should create registration from non-constructor value', () => {
      // Create a simple value
      const value = { data: 'simple-value' };

      // Create a registration from the value with a specific key
      const key = 'value-key';
      const registration = Registration.toValue(value).fromKey(key);

      // Add to container and resolve
      container.add(registration);
      const result = container.resolve(key);
      expect(result).toBe(value);
    });

    it('should create registration from function', () => {
      // Create a function
      const fn = (container: IContainer) => 'function-result';

      // Create a registration from the function
      const registration = Registration.toFn(fn);

      // Add to container with a key and resolve
      registration.fromKey('fn-key');
      container.add(registration);
      const result = container.resolve('fn-key');
      expect(result).toBe('function-result');
    });

    it('should create registration from key', () => {
      // Register a value in the container
      container.add(Registration.toValue('source-value').fromKey('source-key'));

      // Create a registration from the key
      const registration = Registration.toKey('source-key');

      // Add to container with a different key and resolve
      registration.fromKey('target-key');
      container.add(registration);
      const result = container.resolve('target-key');
      expect(result).toBe('source-value');
    });
  });

  describe('instance methods', () => {
    it('should throw error when adding to container without key', () => {
      // Create a registration without a key
      const registration = new Registration(() => Provider.fromValue('test'));

      // Attempt to add to container without setting a key
      expect(() => container.add(registration)).toThrow(DependencyMissingKeyError);
    });

    it('should handle scope predicates', () => {
      // Create a registration
      const registration = new Registration(() => Provider.fromValue('test-value'));
      registration.fromKey('test-key');

      // Add scope predicates
      registration.when(
        (scope) => scope.hasTag('tag1'),
        (scope) => scope.hasTag('tag2'),
      );

      // Add to container
      container.add(registration);

      // Create scopes with different tags
      const scope1 = container.createScope({ tags: ['tag1', 'tag2'] });
      const scope2 = container.createScope({ tags: ['tag1'] });
      const scope3 = container.createScope({ tags: ['tag3'] });

      // Test resolution in different scopes
      expect(scope1.resolve('test-key')).toBe('test-value'); // Both predicates pass
      expect(() => scope2.resolve('test-key')).toThrow(); // Only one predicate passes
      expect(() => scope3.resolve('test-key')).toThrow(); // No predicates pass
    });

    it('should handle provider transformation with pipe', () => {
      // Create a registration
      const registration = new Registration(() => Provider.fromValue('base-value'));
      registration.fromKey('test-key');

      // Add pipe transformations
      registration.pipe(
        (provider) => new Provider((c, o) => `${provider.resolve(c, o)}-transformed1`),
        (provider) => new Provider((c, o) => `${provider.resolve(c, o)}-transformed2`),
      );

      // Add to container
      container.add(registration);

      // Resolve and verify transformations were applied
      const result = container.resolve('test-key');
      expect(result).toBe('base-value-transformed1-transformed2');
    });

    it('should handle key redirection', () => {
      // Create a registration
      const registration = new Registration(() => Provider.fromValue('redirected-value'));
      registration.fromKey('primary-key');

      // Add redirect keys
      registration.redirectFrom('alias1', 'alias2');

      // Add to container
      container.add(registration);

      // Resolve using different keys
      expect(container.resolve('primary-key')).toBe('redirected-value');
      expect(container.resolve('alias1')).toBe('redirected-value');
      expect(container.resolve('alias2')).toBe('redirected-value');
    });
  });
});
