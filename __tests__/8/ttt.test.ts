import 'reflect-metadata';
import { HookedInjector, ProviderBuilder, ProviderRepository, ServiceLocator, SimpleInjector } from '../../lib';
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

        const locator = new ServiceLocator(
            (l) =>
                new HookedInjector(new SimpleInjector(l), {
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
