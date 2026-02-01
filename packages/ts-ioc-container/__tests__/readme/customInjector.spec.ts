import { type constructor, Container, type IContainer, Injector, ProviderOptions, Registration } from '../../lib';

/**
 * Advanced - Custom Injector
 *
 * You can implement your own injection strategy by extending the `Injector` class.
 * This is useful for integrating with other frameworks, supporting legacy patterns,
 * or implementing custom instantiation logic.
 *
 * Example: Static Factory Method Pattern
 * Some classes prefer to control their own instantiation via a static `create` method
 * rather than a public constructor. This custom injector supports that pattern.
 */

interface IFactoryClass<T> {
  create(container: IContainer, ...args: any[]): T;
}

class StaticFactoryInjector extends Injector {
  createInstance<T>(container: IContainer, target: constructor<T>, { args = [] }: ProviderOptions = {}): T {
    // Check if the class has a static 'create' method
    const factoryClass = target as unknown as IFactoryClass<T>;
    if (typeof factoryClass.create === 'function') {
      return factoryClass.create(container, ...args);
    }

    // Fallback to standard constructor instantiation
    return new target(...args);
  }
}

describe('Custom Injector', function () {
  it('should use static create method for instantiation when available', function () {
    class ApiClient {
      constructor(
        public baseUrl: string,
        public timeout: number,
      ) {}

      // Custom factory method
      static create(container: IContainer, config: { timeout: number }): ApiClient {
        const baseUrl = container.resolve<string>('BaseUrl');
        return new ApiClient(baseUrl, config.timeout);
      }
    }

    const container = new Container({ injector: new StaticFactoryInjector() })
      .addRegistration(Registration.fromValue('https://api.example.com').bindToKey('BaseUrl'))
      .addRegistration(Registration.fromClass(ApiClient));

    // Resolve using the custom injector which calls ApiClient.create
    const client = container.resolve(ApiClient, { args: [{ timeout: 5000 }] });

    expect(client.baseUrl).toBe('https://api.example.com');
    expect(client.timeout).toBe(5000);
  });
});
