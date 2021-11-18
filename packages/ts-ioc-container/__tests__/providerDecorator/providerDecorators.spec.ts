import { DIContainer, ServiceLocator, SimpleInjector } from '../../lib';
import { addKeys, level, metadataCollector, singleton } from './decorators';
import { MetadataDIProviderBuilder } from '../../lib/core/MetadataDIProviderBuilder';

@addKeys('key1')
@singleton
@level(0)
export class Greeting {
    private name = Math.random();

    hello(): string {
        return `Hello ${this.name}`;
    }
}

describe('ProviderDecorators', function () {
    it('should sdad', function () {
        const locator = new DIContainer(
            ServiceLocator.fromInjector(new SimpleInjector()),
            new MetadataDIProviderBuilder(metadataCollector),
        ).register((pb) => pb.fromClass(Greeting).build());

        const greeting1 = locator.resolve<Greeting>('key1');
        const greeting2 = locator.resolve<Greeting>('key1');

        expect(greeting1.hello()).toBe(greeting2.hello());
    });
});
