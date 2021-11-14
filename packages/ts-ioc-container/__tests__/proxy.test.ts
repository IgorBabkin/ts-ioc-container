import { IServiceLocator, Provider, ProviderBuilder, ProxyInjector, ServiceLocator } from '../lib';

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
        locator = ServiceLocator.root(new ProxyInjector());
    });

    it('should asd', function () {
        locator.register('name', Provider.fromValue('world'));
        const greeting = locator.resolve(Greeting);

        expect(greeting.say()).toBe('Hello world');
    });

    it('should asd 2', function () {
        locator.register('greeting', ProviderBuilder.fromClass(Greeting).withArgs({ name: 'world' }).build());
        const greeting = locator.resolve<Greeting>('greeting');

        expect(greeting.say()).toBe('Hello world');
    });

    it('should asd 3', function () {
        locator.register('name', Provider.fromValue('world'));
        const greeting = locator.resolve(Greeting);

        expect(greeting.say()).toBe('Hello world');
    });
});
