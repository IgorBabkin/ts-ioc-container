import 'reflect-metadata';
import { Container, fromValue, ServiceLocator } from '../../lib';
import { onConstruct, onConstructMetadataCollector } from './decorators';
import { SimpleInjector } from '../ioc/SimpleInjector';

class MyClass {
    @onConstruct
    onInit(): void {}
}

describe('ServiceLocator', () => {
    it('should create an instance', () => {
        const expectedInstance = { id: 'expectedInstance' };

        const locator = Container.fromInjector(
            new SimpleInjector({
                onConstruct<GInstance>(instance: GInstance) {
                    onConstructMetadataCollector.invokeHooksOf(instance);
                    return instance;
                },
            }),
        );

        locator.register(fromValue(expectedInstance).forKeys('key1').build());

        locator.resolve(MyClass);

        expect(locator.resolve('key1')).toBe(expectedInstance);
    });
});
