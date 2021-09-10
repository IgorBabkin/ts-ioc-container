import {
    IProvider,
    IServiceLocator,
    Provider,
    ProviderRepository,
    ServiceLocator,
    SimpleInjector,
    SingletonProvider,
} from '../../lib';
import { ProviderCannotBeClonedError } from '../../lib/errors/ProviderCannotBeClonedError';

describe('SingletonProvider', function () {
    let locator: IServiceLocator;
    let provider: IProvider<any>;

    beforeEach(() => {
        locator = new ServiceLocator(() => new SimpleInjector(), new ProviderRepository());
        provider = new Provider(() => Math.random());
    });

    test('cannot be cloned', () => {
        const singletonProvider = new SingletonProvider(provider);

        expect(() => singletonProvider.clone()).toThrow(ProviderCannotBeClonedError);
    });

    test('should resolve the same value', () => {
        const singletonProvider = new SingletonProvider(provider);

        expect(singletonProvider.resolve(locator)).toBe(singletonProvider.resolve(locator));
    });
});
