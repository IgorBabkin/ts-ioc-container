import { ProviderBuilder, ProviderNotFoundError, ProviderRepository, ServiceLocator, SimpleInjector } from '../../lib';

describe('LevelProvider', function () {
    test('singleton', () => {
        const locator = new ServiceLocator((l) => new SimpleInjector(l), new ProviderRepository());
        locator.register('hey', new ProviderBuilder(() => Math.random()).asSingleton().forLevel(0).build());

        expect(locator.resolve('hey')).toBe(locator.resolve('hey'));
    });

    describe('scope', function () {
        test('scope', () => {
            const locator = new ServiceLocator((l) => new SimpleInjector(l), new ProviderRepository());
            locator.register('hey', new ProviderBuilder(() => Math.random()).asSingleton().forLevel(1).build());

            expect(() => locator.resolve('hey')).toThrow(ProviderNotFoundError);
        });
        test('scope1', () => {
            const locator = new ServiceLocator((l) => new SimpleInjector(l), new ProviderRepository());
            locator.register('hey', new ProviderBuilder(() => Math.random()).asSingleton().forLevel(1).build());

            const child = locator.createLocator();

            expect(child.resolve('hey')).toBe(child.resolve('hey'));
        });
        test('scope2', () => {
            const locator = new ServiceLocator((l) => new SimpleInjector(l), new ProviderRepository());
            locator.register('hey', new ProviderBuilder(() => Math.random()).asSingleton().forLevel(1).build());

            const child = locator.createLocator();
            const subChild = child.createLocator();

            expect(child.resolve('hey')).toBe(subChild.resolve('hey'));
        });
        test('scope2', () => {
            const locator = new ServiceLocator((l) => new SimpleInjector(l), new ProviderRepository());
            locator.register('hey', new ProviderBuilder(() => Math.random()).asSingleton().forLevel(1).build());

            const child1 = locator.createLocator();
            const child2 = locator.createLocator();

            expect(child1.resolve('hey')).not.toBe(child2.resolve('hey'));
        });
        test('tagged', () => {
            const locator = new ServiceLocator((l) => new SimpleInjector(l), new ProviderRepository());
            locator.register('hey', new ProviderBuilder(() => Math.random()).asSingleton().forTags(['a']).build());

            const child = locator.createLocator(['b']);

            expect(() => child.resolve('hey')).toThrow(ProviderNotFoundError);
        });
        test('tagged1', () => {
            const locator = new ServiceLocator((l) => new SimpleInjector(l), new ProviderRepository());
            locator.register('hey', new ProviderBuilder(() => Math.random()).asSingleton().forTags(['a']).build());

            const child = locator.createLocator(['a']);

            expect(child.resolve('hey')).toBe(child.resolve('hey'));
        });
    });
});
