import 'reflect-metadata';
import { IocInjector, ServiceLocator } from '../../lib';
import { constructorMetadataCollector, inject } from './decorators';
import { MockRepository } from '../MockRepository';
import { ProviderRepository } from '../../lib/core/ProviderRepository';

interface ISubClass {
    greeting(): string;
}

class TestClass1 {
    constructor(@inject((l) => l.resolve('key1')) public dep1: ISubClass) {}
}

describe('UnitTestIoCLocator', () => {
    let mockRepo: MockRepository;

    beforeEach(() => {
        mockRepo = new MockRepository(new ProviderRepository());
    });

    function createIoCLocator() {
        return new ServiceLocator(new IocInjector(constructorMetadataCollector), mockRepo);
    }

    it('ioc', () => {
        const locator = createIoCLocator();

        const mock = mockRepo.findOrCreateMock<ISubClass>('key1');
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = locator.resolve(TestClass1);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
