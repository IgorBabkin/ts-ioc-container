import { IContainer, ProviderNotFoundError, Container, ProviderBuilder } from '../../lib';
import { SimpleInjector } from '../ioc/SimpleInjector';

describe('LevelProvider', function () {
    function createContainer(): IContainer {
        return new Container(new SimpleInjector());
    }

    describe('scope', function () {
        test('tagged', () => {
            const locator = createContainer();
            locator.register(
                ProviderBuilder.fromFn(() => Math.random())
                    .forTags('a')
                    .asSingleton()
                    .forKey('hey')
                    .build(),
            );

            const child = locator.createScope(['b']);

            expect(() => child.resolve('hey')).toThrow(ProviderNotFoundError);
        });
        test('tagged1', () => {
            const locator = createContainer();
            locator.register(
                ProviderBuilder.fromFn(() => Math.random())
                    .forTags('a')
                    .asSingleton()
                    .forKey('hey')
                    .build(),
            );

            const child = locator.createScope(['a']);

            expect(child.resolve('hey')).toBe(child.resolve('hey'));
        });
    });
});
