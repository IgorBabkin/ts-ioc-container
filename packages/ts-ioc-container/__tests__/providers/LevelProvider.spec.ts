import { DIContainer, ProviderNotFoundError, ServiceLocator, SimpleInjector } from '../../lib';

describe('LevelProvider', function () {
    function createContainer(): DIContainer {
        return new DIContainer(ServiceLocator.fromInjector(new SimpleInjector()));
    }

    test('singleton', () => {
        const locator = createContainer();
        locator.register((b) =>
            b
                .fromFn(() => Math.random())
                .forLevel(0)
                .asSingleton()
                .forKeys('hey')
                .build(),
        );

        expect(locator.resolve('hey')).toBe(locator.resolve('hey'));
    });

    describe('scope', function () {
        test('scope', () => {
            const locator = createContainer();
            locator.register((b) =>
                b
                    .fromFn(() => Math.random())
                    .forLevel(1)
                    .asSingleton()
                    .forKeys('hey')
                    .build(),
            );

            expect(() => {
                locator.resolve('hey');
            }).toThrow(ProviderNotFoundError);
        });
        test('scope1', () => {
            const locator = createContainer();
            locator.register((b) =>
                b
                    .fromFn(() => Math.random())
                    .forLevel(1)
                    .asSingleton()
                    .forKeys('hey')
                    .build(),
            );

            const child = locator.createScope();

            expect(child.resolve('hey')).toBe(child.resolve('hey'));
        });
        test('scope2', () => {
            const locator = createContainer();
            locator.register((b) =>
                b
                    .fromFn(() => Math.random())
                    .forLevel(1)
                    .asSingleton()
                    .forKeys('hey')
                    .build(),
            );

            const child = locator.createScope();
            const subChild = child.createScope();

            expect(child.resolve('hey')).toBe(subChild.resolve('hey'));
        });
        test('scope2', () => {
            const locator = createContainer();
            locator.register((b) =>
                b
                    .fromFn(() => Math.random())
                    .forLevel(1)
                    .asSingleton()
                    .forKeys('hey')
                    .build(),
            );

            const child1 = locator.createScope();
            const child2 = locator.createScope();

            expect(child1.resolve('hey')).not.toBe(child2.resolve('hey'));
        });
        test('tagged', () => {
            const locator = createContainer();
            locator.register((b) =>
                b
                    .fromFn(() => Math.random())
                    .forTags('a')
                    .asSingleton()
                    .forKeys('hey')
                    .build(),
            );

            const child = locator.createScope(['b']);

            expect(() => child.resolve('hey')).toThrow(ProviderNotFoundError);
        });
        test('tagged1', () => {
            const locator = createContainer();
            locator.register((b) =>
                b
                    .fromFn(() => Math.random())
                    .forTags('a')
                    .asSingleton()
                    .forKeys('hey')
                    .build(),
            );

            const child = locator.createScope(['a']);

            expect(child.resolve('hey')).toBe(child.resolve('hey'));
        });
    });
});
