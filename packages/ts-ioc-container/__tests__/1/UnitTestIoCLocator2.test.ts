import 'reflect-metadata';
import { IocInjector, MockedRepository, MockProviderStorage, ProviderRepository, ServiceLocator } from '../../lib';
import { inject, injectMetadataCollector } from './decorators';
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
        mockStorage = new MoqProviderStorage(new MockProviderStorage(() => new MoqProvider()));
    });

    function createIoCLocator() {
        return new ServiceLocator(
            new IocInjector(injectMetadataCollector),
            new MockedRepository(ProviderRepository.root(), mockStorage),
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
