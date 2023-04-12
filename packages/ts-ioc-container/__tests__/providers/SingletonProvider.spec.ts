import { IProvider, IContainer, Provider, Container, SingletonProvider, TaggedProvider } from '../../lib';
import { SimpleInjector } from '../ioc/SimpleInjector';

describe('SingletonProvider', function () {
    let locator: IContainer;
    let provider: IProvider<any>;

    function createSingleton<T>(provider: IProvider<T>): IProvider<T> {
        return new TaggedProvider(new SingletonProvider(provider), ['root']);
    }

    beforeEach(() => {
        locator = new Container(new SimpleInjector(), { tags: ['root'] });
        provider = new Provider(() => Math.random());
    });

    test('cannot be cloned', () => {
        const singletonProvider = createSingleton(provider);

        expect(singletonProvider.isValid({ tags: ['child'] })).toBeFalsy();
    });

    test('should resolve the same value', () => {
        const singletonProvider = createSingleton(provider);

        expect(singletonProvider.resolve(locator)).toBe(singletonProvider.resolve(locator));
    });
});
