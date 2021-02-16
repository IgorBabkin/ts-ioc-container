import { IServiceLocator, SimpleServiceLocatorStrategyFactory } from 'ts-ioc-container';
import { UnitTestServiceLocator } from '../lib';
import { Mock } from 'moq.ts';
import { MoqFactory } from './moq/MoqFactory';

interface IDepClass {
    greeting(): string;
}

class TestClass {
    public dep1: IDepClass;

    constructor(l: IServiceLocator) {
        this.dep1 = l.resolve('key1');
    }
}

describe('UnitTestSimpleLocator', () => {
    function createSimpleLocator() {
        return new UnitTestServiceLocator(new SimpleServiceLocatorStrategyFactory(), [], new MoqFactory());
    }

    it('hey', () => {
        const locator = createSimpleLocator();

        const mock = locator.resolveMock('key1') as Mock<IDepClass>;
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = locator.resolve(TestClass);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
