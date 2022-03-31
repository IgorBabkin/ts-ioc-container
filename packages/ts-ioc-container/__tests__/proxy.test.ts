import {Container, fromClass, fromValue, ProxyInjector} from '../lib';

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
    let locator: Container;

    beforeEach(() => {
        locator = Container.fromInjector(new ProxyInjector());
    });

    it('should asd', function () {
        locator.register(fromValue('world').forKeys('name').build());
        const greeting = locator.resolve(Greeting);

        expect(greeting.say()).toBe('Hello world');
    });

    it('should asd 2', function () {
        locator.register(fromClass(Greeting).withArgs({ name: 'world' }).forKeys('greeting').build());
        const greeting = locator.resolve<Greeting>('greeting');

        expect(greeting.say()).toBe('Hello world');
    });

    it('should asd 3', function () {
        locator.register(fromValue('world').forKeys('name').build());
        const greeting = locator.resolve(Greeting);

        expect(greeting.say()).toBe('Hello world');
    });
});
