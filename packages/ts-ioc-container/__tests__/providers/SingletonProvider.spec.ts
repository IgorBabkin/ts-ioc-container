import {
    IProvider,
    IServiceLocator,
    Provider,
    ProviderNotClonedError,
    ProviderRepository,
    ServiceLocator,
    SimpleInjector,
    SingletonProvider,
    SingletonProviderStrategy,
} from '../../lib';

describe('SingletonProvider', function () {
    let locator: IServiceLocator;
    let provider: IProvider<any>;

    beforeEach(() => {
        locator = new ServiceLocator((l) => new SimpleInjector(l), new ProviderRepository());
        provider = new Provider(() => Math.random());
    });

    test('cannot be cloned', () => {
        const singletonProvider = new SingletonProvider(provider, new SingletonProviderStrategy());

        expect(() => singletonProvider.clone()).toThrow(ProviderNotClonedError);
    });

    test('should resolve the same value', () => {
        const singletonProvider = new SingletonProvider(provider, new SingletonProviderStrategy());

        expect(singletonProvider.resolve(locator)).toBe(singletonProvider.resolve(locator));
    });
});
