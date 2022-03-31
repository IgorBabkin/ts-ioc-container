import 'reflect-metadata';
import {Container} from '../../lib';
import {addKeys, fromClass, level, singleton} from './decorators';
import {SimpleInjector} from "../ioc/SimpleInjector";

@addKeys('key1')
@level(1)
@singleton
export class Greeting {
    private name = Math.random();

    hello(): string {
        return `Hello ${this.name}`;
    }
}

describe('ProviderDecorators', function () {
    it('should sdad', function () {
        const locator = Container.fromInjector(new SimpleInjector()).register(
            fromClass(Greeting).build(),
        );

        const scope = locator.createScope();

        const greeting1 = scope.resolve<Greeting>('key1');
        const greeting2 = scope.resolve<Greeting>('key1');

        expect(greeting1.hello()).toBe(greeting2.hello());
    });
});
