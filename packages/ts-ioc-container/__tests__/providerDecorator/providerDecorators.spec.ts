import { Container, ServiceLocator, SimpleInjector } from '../../lib';
import { addKeys, fromClass, level, singleton } from './decorators';

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
        const locator = new Container(ServiceLocator.fromInjector(new SimpleInjector())).register(
            fromClass(Greeting).build(),
        );

        const greeting1 = locator.resolve<Greeting>('key1');
        const greeting2 = locator.resolve<Greeting>('key1');

        expect(greeting1.hello()).toBe(greeting2.hello());
    });
});
