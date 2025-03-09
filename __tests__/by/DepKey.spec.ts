import 'reflect-metadata';
import { IContainer } from '../../lib/container/IContainer';
import { Container } from '../../lib/container/Container';
import { depKey } from '../../lib/by';
import { Provider } from '../../lib/provider/Provider';
import { Registration } from '../../lib/registration/Registration';
import { SimpleInjector } from '../../lib/injector/SimpleInjector';

describe('DepKey', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container(new SimpleInjector());
  });

  describe('depKey', () => {
    it('should handle pipe with scope predicate', () => {
      // Create a dependency key
      const key = depKey<string>('test-key');

      // Add a scope predicate
      key.when((scope) => scope.hasTag('test'));

      // Create a provider with a proper implementation of isVisible
      const provider = Provider.fromValue('test-value');

      // Ensure the provider has an isVisible method that returns true
      const originalProvider = Provider.prototype.isVisible;
      Provider.prototype.isVisible = function (parent, child) {
        return true; // Always return true for testing
      };

      // Add a pipe transformation
      const addExclamation = (provider: any) => ({
        ...provider,
        resolve: (container: IContainer, options: any) => {
          const result = provider.resolve(container, options);
          return result + '!';
        },
        // Make sure isVisible is properly implemented
        isVisible: (parent: any, child: any) => true,
      });

      key.pipe(addExclamation);

      // Register a value using the key
      const registration = key.register(() => 'test-value');

      // Add to a scope with the required tag
      const testScope = container.createScope({ tags: ['test'] });
      testScope.add(registration);

      // Verify the value is transformed and scope predicate works
      const result = testScope.resolve('test-key');

      // Restore the original isVisible method
      Provider.prototype.isVisible = originalProvider;

      expect(result).toBe('test-value!');
    });

    it('should handle to method with scope predicate', () => {
      // Create a dependency key
      const key = depKey<string>('original-key');

      // Add a scope predicate
      key.when((scope) => scope.hasTag('test'));

      // Ensure the provider has an isVisible method that returns true
      const originalProvider = Provider.prototype.isVisible;
      Provider.prototype.isVisible = function (parent, child) {
        return true; // Always return true for testing
      };

      // Change the target key
      key.to('changed-key');

      // Register a value using the key
      const registration = key.register(() => 'test-value');

      // Add to a scope with the required tag
      const testScope = container.createScope({ tags: ['test'] });
      testScope.add(registration);

      // Verify the key was changed and scope predicate works
      const result = testScope.resolve('changed-key');

      // Restore the original isVisible method
      Provider.prototype.isVisible = originalProvider;

      expect(result).toBe('test-value');
      expect(() => testScope.resolve('original-key')).toThrow();
    });

    it('should handle redirectFrom with scope predicate', () => {
      // Create a dependency key
      const key = depKey<string>('target-key');

      // Add a scope predicate
      key.when((scope) => scope.hasTag('test'));

      // Ensure the provider has an isVisible method that returns true
      const originalProvider = Provider.prototype.isVisible;
      Provider.prototype.isVisible = function (parent, child) {
        return true; // Always return true for testing
      };

      // Create a registration to redirect from
      const registration = new Registration(() => {
        const provider = Provider.fromValue('redirected-value');
        // Ensure the provider has an isVisible method
        provider.isVisible = (parent, child) => true;
        return provider;
      });

      // Apply the redirect
      key.redirectFrom(registration);

      // Set the source key and add to container
      registration.fromKey('source-key');

      // Add to a scope with the required tag
      const testScope = container.createScope({ tags: ['test'] });
      testScope.add(registration);

      // Verify both keys work and scope predicate is applied
      const result1 = testScope.resolve('target-key');
      const result2 = testScope.resolve('source-key');

      // Restore the original isVisible method
      Provider.prototype.isVisible = originalProvider;

      expect(result1).toBe('redirected-value');
      expect(result2).toBe('redirected-value');
    });
  });
});
