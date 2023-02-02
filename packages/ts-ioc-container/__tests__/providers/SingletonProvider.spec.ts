import { IProvider, IContainer, LevelProvider, Provider, Container, SingletonProvider } from '../../lib';
import { SimpleInjector } from '../ioc/SimpleInjector';

describe('SingletonProvider', function () {
    let locator: IContainer;
    let provider: IProvider<any>;

    function createSingleton<T>(provider: IProvider<T>): IProvider<T> {
        return new LevelProvider(new SingletonProvider(provider), [0, 0]);
    }

    beforeEach(() => {
        locator = new Container(new SimpleInjector());
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
