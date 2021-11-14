import 'reflect-metadata';
import { HookedInjector, ProviderBuilder, ServiceLocator, SimpleInjector } from '../../lib';
import { onConstruct, onConstructMetadataCollector } from './decorators';

class MyClass {
    @onConstruct
    onInit(): void {}
}

describe('ServiceLocator', () => {
    it('should create an instance', () => {
        const expectedInstance = { id: 'expectedInstance' };

        const locator = ServiceLocator.root(
            new HookedInjector(new SimpleInjector(), {
                onConstruct<GInstance>(instance: GInstance) {
                    onConstructMetadataCollector.invokeHooksOf(instance);
                },
                onDispose<GInstance>(instance: GInstance) {},
            }),
        );

        locator.register(
            'key1',
            ProviderBuilder.fromValue(expectedInstance)
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
