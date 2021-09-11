import 'reflect-metadata';
import { IocInjector, MockedRepository, ProviderRepository, ServiceLocator } from '../../lib';
import { constructorMetadataCollector, inject } from './decorators';
import { MoqProvider, MoqProviderStorage } from '../MoqProviderStorage';

interface ISubClass {
    greeting(): string;
}

class TestClass1 {
    constructor(@inject((l) => l.resolve('key1')) public dep1: ISubClass) {}
}

describe('UnitTestIoCLocator', () => {
    let mockStorage: MoqProviderStorage;

    beforeEach(() => {
        mockStorage = new MoqProviderStorage(() => new MoqProvider());
    });

    function createIoCLocator() {
        return new ServiceLocator(
            () => new IocInjector(constructorMetadataCollector),
            new MockedRepository(new ProviderRepository(), mockStorage),
        );
    }

    it('ioc', () => {
        const locator = createIoCLocator();

        const mock = mockStorage.findMock<ISubClass>('key1');
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = locator.resolve(TestClass1);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
