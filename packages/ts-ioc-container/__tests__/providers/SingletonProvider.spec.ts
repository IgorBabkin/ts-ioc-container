import { IKeyedProvider, LevelProvider, Provider, ServiceLocator, SimpleInjector, SingletonProvider } from '../../lib';

describe('SingletonProvider', function () {
    let locator: ServiceLocator;
    let provider: IKeyedProvider<any>;

    function createSingleton<T>(provider: IKeyedProvider<T>): IKeyedProvider<T> {
        return new LevelProvider(new SingletonProvider(provider), [0, 0]);
    }

    beforeEach(() => {
        locator = ServiceLocator.root(new SimpleInjector());
        provider = new Provider(() => Math.random());
    });

    test('cannot be cloned', () => {
        const singletonProvider = createSingleton(provider);

        expect(singletonProvider.isValid({ level: 1, tags: [] })).toBeFalsy();
    });

    test('should resolve the same value', () => {
        const singletonProvider = createSingleton(provider);

        expect(singletonProvider.resolve(locator)).toBe(singletonProvider.resolve(locator));
    });
});
