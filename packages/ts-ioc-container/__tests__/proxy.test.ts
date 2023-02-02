import { fromClass, fromValue, IServiceLocator, ProxyInjector, ServiceLocator } from '../lib';

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
    let locator: IServiceLocator;

    beforeEach(() => {
        locator = new ServiceLocator(new ProxyInjector());
    });

    it('should asd', function () {
        locator.register(fromValue('world').forKey('name').build());
        const greeting = locator.resolve(Greeting);

        expect(greeting.say()).toBe('Hello world');
    });

    it('should asd 2', function () {
        locator.register(fromClass(Greeting).withArgs({ name: 'world' }).forKey('greeting').build());
        const greeting = locator.resolve<Greeting>('greeting');

        expect(greeting.say()).toBe('Hello world');
    });

    it('should asd 3', function () {
        locator.register(fromValue('world').forKey('name').build());
        const greeting = locator.resolve(Greeting);

        expect(greeting.say()).toBe('Hello world');
    });
});
