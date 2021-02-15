import 'reflect-metadata';
import { MoqFactory, UnitTestServiceLocator } from '../lib';
import { inject, IocServiceLocatorStrategyFactory, metadataCollector } from 'ts-ioc-container';
import { Mock } from 'moq.ts';

interface ISubClass {
    greeting(): string;
}

class TestClass1 {
    constructor(@inject('key1') public dep1: ISubClass) {}
}

describe('UnitTestIoCLocator', () => {
    function createIoCLocator() {
        return new UnitTestServiceLocator(
            new IocServiceLocatorStrategyFactory(metadataCollector),
            [],
            new MoqFactory(),
        );
    }

    it('ioc', () => {
        const locator = createIoCLocator();

        const mock = locator.resolveMock('key1') as Mock<ISubClass>;
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = locator.resolve(TestClass1);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
