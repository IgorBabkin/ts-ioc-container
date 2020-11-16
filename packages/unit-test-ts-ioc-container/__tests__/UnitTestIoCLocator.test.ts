import 'reflect-metadata';
import { MoqFactory, UnitTestServiceLocatorFactory } from '../lib';
import { inject } from 'ts-ioc-container';
import { Mock } from 'moq.ts';

interface ISubClass {
    greeting(): string;
}

class TestClass1 {
    constructor(@inject('key1') public dep1: ISubClass) {}
}

describe('UnitTestIoCLocator', () => {
    const locatorFactory = new UnitTestServiceLocatorFactory(new MoqFactory());

    it('ioc', () => {
        const locator = locatorFactory.createIoCLocator();

        const mock = locator.resolveMock('key1') as Mock<ISubClass>;
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = locator.resolve(TestClass1);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
