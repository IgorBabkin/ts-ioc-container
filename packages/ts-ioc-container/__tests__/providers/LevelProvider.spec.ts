import { ProviderBuilder, ProviderNotFoundError, ServiceLocator, SimpleInjector } from '../../lib';

describe('LevelProvider', function () {
    test('singleton', () => {
        const locator = ServiceLocator.root(new SimpleInjector());
        locator.register(
            'hey',
            ProviderBuilder.fromFn(() => Math.random())
                .forLevel(0)
                .asSingleton(),
        );

        expect(locator.resolve('hey')).toBe(locator.resolve('hey'));
    });

    describe('scope', function () {
        test('scope', () => {
            const locator = ServiceLocator.root(new SimpleInjector());
            locator.register(
                'hey',
                ProviderBuilder.fromFn(() => Math.random())
                    .forLevel(1)
                    .asSingleton(),
            );

            expect(() => locator.resolve('hey')).toThrow(ProviderNotFoundError);
        });
        test('scope1', () => {
            const locator = ServiceLocator.root(new SimpleInjector());
            locator.register(
                'hey',
                ProviderBuilder.fromFn(() => Math.random())
                    .forLevel(1)
                    .asSingleton(),
            );

            const child = locator.createScope();

            expect(child.resolve('hey')).toBe(child.resolve('hey'));
        });
        test('scope2', () => {
            const locator = ServiceLocator.root(new SimpleInjector());
            locator.register(
                'hey',
                ProviderBuilder.fromFn(() => Math.random())
                    .forLevel(1)
                    .asSingleton(),
            );

            const child = locator.createScope();
            const subChild = child.createScope();

            expect(child.resolve('hey')).toBe(subChild.resolve('hey'));
        });
        test('scope2', () => {
            const locator = ServiceLocator.root(new SimpleInjector());
            locator.register(
                'hey',
                ProviderBuilder.fromFn(() => Math.random())
                    .forLevel(1)
                    .asSingleton(),
            );

            const child1 = locator.createScope();
            const child2 = locator.createScope();

            expect(child1.resolve('hey')).not.toBe(child2.resolve('hey'));
        });
        test('tagged', () => {
            const locator = ServiceLocator.root(new SimpleInjector());
            locator.register(
                'hey',
                ProviderBuilder.fromFn(() => Math.random())
                    .forTags(['a'])
                    .asSingleton(),
            );

            const child = locator.createScope(['b']);

            expect(() => child.resolve('hey')).toThrow(ProviderNotFoundError);
        });
        test('tagged1', () => {
            const locator = ServiceLocator.root(new SimpleInjector());
            locator.register(
                'hey',
                ProviderBuilder.fromFn(() => Math.random())
                    .forTags(['a'])
                    .asSingleton(),
            );

            const child = locator.createScope(['a']);

            expect(child.resolve('hey')).toBe(child.resolve('hey'));
        });
    });
});
