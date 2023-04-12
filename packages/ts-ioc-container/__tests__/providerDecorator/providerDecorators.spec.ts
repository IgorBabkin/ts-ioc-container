import 'reflect-metadata';
import { asSingleton, Container, forKey, perTags, ProviderBuilder } from '../../lib';
import { SimpleInjector } from '../ioc/SimpleInjector';

@asSingleton
@forKey('key1')
@perTags('child')
export class Greeting {
    private name = Math.random();

    hello(): string {
        return `Hello ${this.name}`;
    }
}

describe('ProviderDecorators', function () {
    it('should sdad', function () {
        const locator = new Container(new SimpleInjector()).register(ProviderBuilder.fromClass(Greeting).build());

        const scope = locator.createScope(['child']);

        const greeting1 = scope.resolve<Greeting>('key1');
        const greeting2 = scope.resolve<Greeting>('key1');

        expect(greeting1.hello()).toBe(greeting2.hello());
    });
});
