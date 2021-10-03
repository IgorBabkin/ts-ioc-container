import {
    IProvider,
    IServiceLocator,
    LevelProvider,
    Provider,
    ProviderNotClonedError,
    ProviderRepository,
    RangeType,
    ServiceLocator,
    SimpleInjector,
    SingletonProvider,
} from '../../lib';

describe('SingletonProvider', function () {
    let locator: IServiceLocator;
    let provider: IProvider<any>;

    function createSingleton<T>(provider: IProvider<T>): IProvider<T> {
        return new LevelProvider(new SingletonProvider(provider), new RangeType([0, 0]));
    }

    beforeEach(() => {
        locator = new ServiceLocator((l) => new SimpleInjector(l), new ProviderRepository());
        provider = new Provider(() => Math.random());
    });

    test('cannot be cloned', () => {
        const singletonProvider = createSingleton(provider);

        expect(() => singletonProvider.clone({ level: 1 })).toThrow(ProviderNotClonedError);
    });

    test('should resolve the same value', () => {
        const singletonProvider = createSingleton(provider);

        expect(singletonProvider.resolve(locator)).toBe(singletonProvider.resolve(locator));
    });
});
