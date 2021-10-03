import 'reflect-metadata';
import { ProviderBuilder, SimpleLocatorBuilder } from '../../lib';
import { onConstruct, onConstructMetadataCollector } from './decorators';

class MyClass {
    @onConstruct
    onInit(): void {
        console.log('HEY');
    }
}

describe('ServiceLocator', () => {
    it('should create an instance', () => {
        const expectedInstance = { id: 'expectedInstance' };

        const locator = new SimpleLocatorBuilder()
            .withInjectorHook({
                onConstruct<GInstance>(instance: GInstance) {
                    onConstructMetadataCollector.invokeHooksOf(instance);
                },
                onDispose<GInstance>(instance: GInstance) {},
            })
            .build();

        locator.register(
            'key1',
            ProviderBuilder.fromInstance(expectedInstance)
                .withHook({
                    onDispose<GInstance>(instance: GInstance) {},
                    onConstruct<GInstance>(instance: GInstance) {
                        onConstructMetadataCollector.invokeHooksOf(instance);
                    },
                })
                .build(),
        );

        locator.resolve(MyClass);

        expect(locator.resolve('key1')).toBe(expectedInstance);
    });
});
