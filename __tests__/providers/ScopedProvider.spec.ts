import {
    IProvider,
    IServiceLocator,
    Provider,
    ProviderNotResolvedError,
    ProviderRepository,
    ScopedProvider,
    ServiceLocator,
    SimpleInjector,
    SingletonProvider,
} from '../../lib';

describe('ScopedProvider', function () {
    let locator: IServiceLocator;
    let provider: IProvider<any>;

    beforeEach(() => {
        locator = new ServiceLocator(new SimpleInjector(), new ProviderRepository());
        provider = new Provider(() => 1);
    });

    test('cannot resolve dependency from scoped provider', () => {
        const scopedProvider = new ScopedProvider(provider);

        expect(() => scopedProvider.resolve(locator)).toThrow(ProviderNotResolvedError);
    });

    test('can be cloned', () => {
        const scopedProvider = new ScopedProvider(provider);

        expect(scopedProvider.canBeCloned).toBe(true);
    });

    test('should be cloned as singleton', () => {
        const scopedProvider = new ScopedProvider(provider);

        expect(scopedProvider.clone() instanceof SingletonProvider).toBe(true);
    });
});
