import { IServiceLocator, Provider, registerModule, ServiceLocator, SimpleInjector } from '../lib';

class Greeting {
    private readonly name: string;

    constructor(locator: IServiceLocator) {
        this.name = locator.resolve('name');
    }

    say(): string {
        return `Hello ${this.name}`;
    }
}

describe('module', function () {
    let locator: IServiceLocator;

    beforeEach(() => {
        locator = ServiceLocator.root(new SimpleInjector());
    });

    it('should asd 3', function () {
        registerModule(locator, {
            name: Provider.fromInstance('world'),
        });
        const greeting = locator.resolve(Greeting);

        expect(greeting.say()).toBe('Hello world');
    });
});
