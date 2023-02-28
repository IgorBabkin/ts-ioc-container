import 'reflect-metadata';
import { IContainer, ProxyInjector, Container, ProviderBuilder } from '../lib';

class Greeting {
    private readonly name: string;

    constructor({ name }: { name: string }) {
        this.name = name;
    }

    say(): string {
        return `Hello ${this.name}`;
    }
}

describe('proxy', function () {
    let locator: IContainer;

    beforeEach(() => {
        locator = new Container(new ProxyInjector());
    });

    it('should asd', function () {
        locator.register(ProviderBuilder.fromValue('world').forKey('name').build());
        const greeting = locator.resolve(Greeting);

        expect(greeting.say()).toBe('Hello world');
    });

    it('should asd 2', function () {
        locator.register(ProviderBuilder.fromClass(Greeting).withArgs({ name: 'world' }).forKey('greeting').build());
        const greeting = locator.resolve<Greeting>('greeting');

        expect(greeting.say()).toBe('Hello world');
    });

    it('should asd 3', function () {
        locator.register(ProviderBuilder.fromValue('world').forKey('name').build());
        const greeting = locator.resolve(Greeting);

        expect(greeting.say()).toBe('Hello world');
    });
});
