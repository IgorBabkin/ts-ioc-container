import {
    IProvider,
    IServiceLocator,
    Provider,
    ProviderNotClonedError,
    ProviderRepository,
    ServiceLocator,
    SimpleInjector,
    SingletonProvider,
} from '../../lib';

describe('SingletonProvider', function () {
    let locator: IServiceLocator;
    let provider: IProvider<any>;

    beforeEach(() => {
        locator = new ServiceLocator(() => new SimpleInjector(), new ProviderRepository());
        provider = new Provider(() => Math.random());
    });

    test('cannot be cloned', () => {
        const singletonProvider = new SingletonProvider(provider);

        expect(singletonProvider.canBeCloned).toBe(false);
        expect(() => singletonProvider.clone()).toThrow(ProviderNotClonedError);
    });

    test('should resolve the same value', () => {
        const singletonProvider = new SingletonProvider(provider);

        expect(singletonProvider.resolve(locator)).toBe(singletonProvider.resolve(locator));
    });
});
