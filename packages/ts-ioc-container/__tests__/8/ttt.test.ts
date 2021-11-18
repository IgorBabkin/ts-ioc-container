import 'reflect-metadata';
import { CachedResolvableHook, ContainerBuilder, HookedInjector, SimpleInjector } from '../../lib';
import { onConstruct, onConstructMetadataCollector } from './decorators';

class MyClass {
    @onConstruct
    onInit(): void {}
}

describe('ServiceLocator', () => {
    it('should create an instance', () => {
        const expectedInstance = { id: 'expectedInstance' };

        const hook = new CachedResolvableHook({
            onConstruct<GInstance>(instance: GInstance) {
                onConstructMetadataCollector.invokeHooksOf(instance);
            },
            onDispose<GInstance>(instance: GInstance) {},
        });

        const locator = new ContainerBuilder(new SimpleInjector())
            .mapInjector((l) => new HookedInjector(new SimpleInjector(), hook))
            .build();

        locator.register((b) => b.fromValue(expectedInstance).withHook(hook).forKeys('key1').build());

        locator.resolve(MyClass);

        expect(locator.resolve('key1')).toBe(expectedInstance);
    });
});
