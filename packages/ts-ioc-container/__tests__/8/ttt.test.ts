import 'reflect-metadata';
import { ProviderBuilder, ServiceLocator, SimpleInjector } from '../../lib';
import { onConstruct, onConstructMetadataCollector } from './decorators';

class MyClass {
    @onConstruct
    onInit(): void {}
}

describe('ServiceLocator', () => {
    it('should create an instance', () => {
        const expectedInstance = { id: 'expectedInstance' };

        const locator = ServiceLocator.root(new SimpleInjector(), {
            hook: {
                onConstruct<GInstance>(instance: GInstance) {
                    onConstructMetadataCollector.invokeHooksOf(instance);
                },
                onDispose<GInstance>(instance: GInstance) {},
            },
        });

        locator.register(
            ProviderBuilder.fromValue(expectedInstance)
                .withHook({
                    onDispose<GInstance>(instance: GInstance) {},
                    onConstruct<GInstance>(instance: GInstance) {
                        onConstructMetadataCollector.invokeHooksOf(instance);
                    },
                })
                .forKeys('key1')
                .build(),
        );

        locator.resolve(MyClass);

        expect(locator.resolve('key1')).toBe(expectedInstance);
    });
});
