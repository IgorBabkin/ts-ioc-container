import 'reflect-metadata';
import { IContainer, Tagged, AliasPredicate } from '../../lib';
import { Container } from '../../lib';
import { IProvider, ProviderDecorator, ProviderResolveOptions, ChildrenVisibilityPredicate, ArgsFn } from '../../lib';
import { Provider } from '../../lib';
import { SimpleInjector } from '../../lib';

describe('IProvider', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container(new SimpleInjector());
  });

  // Create a test class that extends ProviderDecorator for testing
  class TestProviderDecorator<T> extends ProviderDecorator<T> {
    constructor(decorated: IProvider<T>) {
      super(decorated);
    }
  }

  describe('ProviderDecorator', () => {
    it('should decorate a provider and delegate methods', () => {
      // Create a base provider
      const baseProvider = Provider.fromValue('test-value');

      // Create a decorator using our test class
      const decorator = new TestProviderDecorator(baseProvider);

      // Test resolve method
      expect(decorator.resolve(container, { args: [] })).toBe('test-value');

      // Test pipe method
      const piped = decorator.pipe((provider: IProvider<string>) => ({
        ...provider,
        resolve: (c: IContainer, o: ProviderResolveOptions) => provider.resolve(c, o) + '-piped',
      }));

      expect(piped.resolve(container, { args: [] })).toBe('test-value-piped');
    });

    it('should handle aliases', () => {
      // Create a provider with aliases
      const baseProvider = Provider.fromValue('aliased-value');
      baseProvider.addAliases('api', 'service');

      // Create a decorator using our test class
      const decorator = new TestProviderDecorator(baseProvider);

      // Test matchAliases method
      expect(decorator.matchAliases((aliases: Set<string>) => aliases.has('api'))).toBe(true);
      expect(decorator.matchAliases((aliases: Set<string>) => aliases.has('unknown'))).toBe(false);

      // Test addAliases method
      decorator.addAliases('extra');
      expect(decorator.matchAliases((aliases: Set<string>) => aliases.has('extra'))).toBe(true);
    });

    it('should handle visibility', () => {
      // Create a provider
      const baseProvider = Provider.fromValue('visibility-test');

      // Create a decorator using our test class
      const decorator = new TestProviderDecorator(baseProvider);

      // Mock the isVisible method in the base provider to return true
      baseProvider.isVisible = jest.fn().mockReturnValue(true);

      // Test isVisible method
      const parent: Tagged = { hasTag: (tag: string) => tag === 'parent' };
      const child: Tagged = { hasTag: (tag: string) => tag === 'child' };

      // Verify the decorator delegates to the base provider
      expect(decorator.isVisible(container, child)).toBe(true);
      expect(baseProvider.isVisible).toHaveBeenCalledWith(container, child);
    });

    it('should handle args', () => {
      // Create a mock provider with controlled behavior
      const baseProvider = {
        resolve: jest.fn().mockImplementation((c: IContainer, options: ProviderResolveOptions) => {
          const args = options?.args || [];
          return `args: ${args.join(', ')}`;
        }),
        isVisible: jest.fn(),
        pipe: jest.fn(),
        setVisibility: jest.fn(),
        setArgs: jest.fn(),
        matchAliases: jest.fn(),
        addAliases: jest.fn(),
      };

      // Create a decorator using our test class
      const decorator = new TestProviderDecorator(baseProvider);

      // Mock the setArgs implementation to store the function
      let storedArgsFn: ArgsFn | undefined;
      baseProvider.setArgs.mockImplementation((fn: ArgsFn) => {
        storedArgsFn = fn;
        return baseProvider;
      });

      // Test setArgs method
      decorator.setArgs((c: IContainer, ...args: unknown[]) => [...args, 'extra']);

      // Verify setArgs was called on the base provider
      expect(baseProvider.setArgs).toHaveBeenCalled();

      // Simulate resolve with the stored args function
      const options: ProviderResolveOptions = { args: ['arg1', 'arg2'] };

      // Mock the resolve implementation to use our stored args function
      baseProvider.resolve.mockImplementation((c: IContainer, opts: ProviderResolveOptions) => {
        const transformedArgs = storedArgsFn ? storedArgsFn(c, ...opts.args) : opts.args;
        return `args: ${transformedArgs.join(', ')}`;
      });

      // Test resolve with args
      expect(decorator.resolve(container, options)).toBe('args: arg1, arg2, extra');
    });
  });
});
