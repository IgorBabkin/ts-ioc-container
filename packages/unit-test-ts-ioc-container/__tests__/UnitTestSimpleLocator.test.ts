import { HookFactory, IServiceLocator, SimpleInjectorFactory } from 'ts-ioc-container';
import { UnitTestServiceLocator } from '../lib';
import { Mock } from 'moq.ts';
import { MoqFactory } from './moq/MoqFactory';

interface IDepClass {
    greeting(): string;
}

class TestClass {
    dep1: IDepClass;

    constructor(l: IServiceLocator) {
        this.dep1 = l.resolve('key1');
    }
}

describe('UnitTestSimpleLocator', () => {
    function createSimpleLocator() {
        return new UnitTestServiceLocator(new SimpleInjectorFactory(), new HookFactory(), new MoqFactory());
    }

    it('hey', () => {
        const locator = createSimpleLocator();

        const mock = locator.resolveMock('key1') as Mock<IDepClass>;
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = locator.resolve(TestClass);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
