import 'reflect-metadata';
import { IContainer } from '../../lib/container/IContainer';
import { Container } from '../../lib/container/Container';
import { Provider } from '../../lib/provider/Provider';
import { SimpleInjector } from '../../lib/injector/SimpleInjector';
import { IProvider, getTransformers, ProviderResolveOptions } from '../../lib/provider/IProvider';
import { Registration } from '../../lib/registration/Registration';

describe('Provider', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container(new SimpleInjector());
  });

  describe('static methods', () => {
    it('should create provider from class', () => {
      // Create a class
      class TestClass {
        getValue() {
          return 'class-value';
        }
      }

      // Add transformers to the class
      const transformer = (provider: IProvider<any>) => provider;
      Reflect.defineMetadata('provider', [transformer], TestClass);

      // Create a provider from the class
      const provider = Provider.fromClass(TestClass);

      // Verify the provider is created
      expect(provider).toBeInstanceOf(Provider);

      // Resolve the provider
      const instance = provider.resolve(container, { args: [] });
      expect(instance).toBeInstanceOf(TestClass);
      expect(instance.getValue()).toBe('class-value');
    });

    it('should create provider from constructor value with transformers', () => {
      // Create a class with transformers
      class TestClass {
        getValue() {
          return 'value-from-constructor';
        }
      }

      // Add transformers to the class
      const transformer = (provider: IProvider<any>) => provider;
      Reflect.defineMetadata('provider', [transformer], TestClass);

      // Create a provider from the class as a value
      const provider = Provider.fromValue(TestClass);

      // Verify the provider is created
      expect(provider).toBeInstanceOf(Provider);

      // Resolve the provider - should return the class itself, not an instance
      const result = provider.resolve(container, { args: [] });
      expect(result).toBe(TestClass);
    });

    it('should create provider from non-constructor value', () => {
      // Create a simple value
      const value = { data: 'simple-value' };

      // Create a provider from the value
      const provider = Provider.fromValue(value);

      // Verify the provider is created
      expect(provider).toBeInstanceOf(Provider);

      // Resolve the provider
      const result = provider.resolve(container, { args: [] });
      expect(result).toBe(value);
    });

    it('should create provider from key', () => {
      // Register a value in the container
      const key = 'test-key';
      container.add(Registration.toValue('key-value').fromKey(key));

      // Create a provider from the key
      const provider = Provider.fromKey(key);

      // Verify the provider is created
      expect(provider).toBeInstanceOf(Provider);

      // Resolve the provider
      const result = provider.resolve(container, { args: [] });
      expect(result).toBe('key-value');
    });
  });

  describe('instance methods', () => {
    it('should handle visibility predicates', () => {
      // Create a provider
      const provider = Provider.fromValue('test-value');

      // Set visibility predicate
      const predicate = jest.fn(({ child }) => child.hasTag('visible'));
      provider.setVisibility(predicate);

      // Test with a visible child
      const visibleChild = { hasTag: (tag: string) => tag === 'visible' };
      expect(provider.isVisible(container, visibleChild)).toBe(true);
      expect(predicate).toHaveBeenCalledWith({ child: visibleChild, isParent: false });

      // Test with an invisible child
      const invisibleChild = { hasTag: (tag: string) => tag !== 'visible' };
      expect(provider.isVisible(container, invisibleChild)).toBe(false);
    });

    it('should handle args transformation', () => {
      // Create a provider that uses args
      const provider = new Provider((c, options) => {
        const args = options?.args || [];
        return `args: ${args.join(', ')}`;
      });

      // Set args transformation
      provider.setArgs((c, ...args) => [...args, 'extra']);

      // Test resolve with args
      const result = provider.resolve(container, { args: ['arg1', 'arg2'] });
      // The args are combined with the extra args from the provider
      expect(result).toContain('args: arg1, arg2');
    });

    it('should handle pipe transformations', () => {
      // Create a provider
      const provider = Provider.fromValue('base-value');

      // Add a pipe transformation
      const transformed = provider.pipe((p) => ({
        ...p,
        resolve: (c, o) => `${p.resolve(c, o)}-transformed`,
      }));

      // Verify the transformation
      expect(transformed.resolve(container, { args: [] })).toBe('base-value-transformed');
    });

    it('should handle aliases', () => {
      // Create a provider
      const provider = Provider.fromValue('aliased-value');

      // Add aliases
      provider.addAliases('api', 'service');

      // Test matching aliases
      expect(provider.matchAliases((aliases) => aliases.has('api'))).toBe(true);
      expect(provider.matchAliases((aliases) => aliases.has('unknown'))).toBe(false);
    });
  });
});
