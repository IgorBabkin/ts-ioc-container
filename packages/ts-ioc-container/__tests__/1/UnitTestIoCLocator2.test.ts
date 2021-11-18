import 'reflect-metadata';
import { DIContainer, IocInjector, ServiceLocator } from '../../lib';
import { inject, injectMetadataCollector } from './decorators';
import { MoqServiceLocator } from '../MoqProviderStorage';

interface ISubClass {
    greeting(): string;
}

class TestClass1 {
    constructor(@inject((l) => l.resolve('key1')) public dep1: ISubClass) {}
}

describe('UnitTestIoCLocator', () => {
    let locator: MoqServiceLocator;

    function createIoCLocator() {
        locator = new MoqServiceLocator(ServiceLocator.root(new IocInjector(injectMetadataCollector)));
        return new DIContainer(locator);
    }

    it('ioc', () => {
        const container = createIoCLocator();
        const mock = locator.resolveMock<ISubClass>('key1');
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = container.resolve(TestClass1);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
