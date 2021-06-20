import 'reflect-metadata';
import {
    constant,
    InstanceHookInjector,
    InstanceHookProvider,
    ProviderRepository,
    ServiceLocator,
    SimpleInjector,
} from '../../lib';
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
            new InstanceHookProvider(
                constant(expectedInstance),
                {
                    resolving: 'perRequest',
                },
                {
                    onDispose<GInstance>(instance: GInstance) {},
                    onConstruct<GInstance>(instance: GInstance) {
                        onConstructMetadataCollector.invokeHooksOf(instance);
                    },
                },
            ),
        );

        locator.resolve(MyClass);

        expect(locator.resolve('key1')).toBe(expectedInstance);
    });
});
