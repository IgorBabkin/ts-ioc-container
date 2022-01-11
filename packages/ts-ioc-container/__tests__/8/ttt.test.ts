import 'reflect-metadata';
import { ContainerBuilder, fromValue, SimpleInjector } from '../../lib';
import { onConstruct, onConstructMetadataCollector } from './decorators';

class MyClass {
    @onConstruct
    onInit(): void {}
}

describe('ServiceLocator', () => {
    it('should create an instance', () => {
        const expectedInstance = { id: 'expectedInstance' };

        const locator = new ContainerBuilder(new SimpleInjector())
            .setHook({
                onConstruct<GInstance>(instance: GInstance) {
                    onConstructMetadataCollector.invokeHooksOf(instance);
                    return instance;
                },
                onResolve<T>(instance: T): T {
                    return instance;
                },
                onDispose<GInstance>(instance: GInstance) {},
            })
            .build();

        locator.register(fromValue(expectedInstance).forKeys('key1').build());

        locator.resolve(MyClass);

        expect(locator.resolve('key1')).toBe(expectedInstance);
    });
});
