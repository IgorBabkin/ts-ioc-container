import 'reflect-metadata';
import { InstanceHookInjector, ProviderRepository, ServiceLocator, SimpleInjector } from '../../lib';
import { onConstruct, onConstructMetadataCollector } from './decorators';
import { ProviderBuilder } from '../../lib/core/ProviderBuilder';

class MyClass {
    @onConstruct
    onInit(): void {
        console.log('HEY');
    }
}

describe('ServiceLocator', () => {
    it('should create an instance', () => {
        const expectedInstance = { id: 'expectedInstance' };

        const locator = new ServiceLocator(
            new InstanceHookInjector(new SimpleInjector(), {
                onConstruct<GInstance>(instance: GInstance) {
                    onConstructMetadataCollector.invokeHooksOf(instance);
                },
                onDispose<GInstance>(instance: GInstance) {},
            }),
            new ProviderRepository(),
        );

        locator.register(
            'key1',
            ProviderBuilder.fromInstance(expectedInstance)
                .withHook({
                    onDispose<GInstance>(instance: GInstance) {},
                    onConstruct<GInstance>(instance: GInstance) {
                        onConstructMetadataCollector.invokeHooksOf(instance);
                    },
                })
                .asRequested(),
        );

        locator.resolve(MyClass);

        expect(locator.resolve('key1')).toBe(expectedInstance);
    });
});
