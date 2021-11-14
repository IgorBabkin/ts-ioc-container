import { ServiceLocator, SimpleInjector } from '../../lib';
import { fromClass, level, singleton } from './decorators';

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
        const locator = ServiceLocator.root(new SimpleInjector()).register('key1', fromClass(Greeting).build());
        const greeting1 = locator.resolve<Greeting>('key1');
        const greeting2 = locator.resolve<Greeting>('key1');

        expect(greeting1.hello()).toBe(greeting2.hello());
    });
});
