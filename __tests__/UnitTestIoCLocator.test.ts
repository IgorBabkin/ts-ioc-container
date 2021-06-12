import 'reflect-metadata';
import { IocInjector, MockHook, ServiceLocator } from '../lib';
import { MoqRepository } from './MoqRepository';
import { inject, metadataCollector } from './decorators';

interface ISubClass {
    greeting(): string;
}

class TestClass1 {
    constructor(@inject('key1') public dep1: ISubClass) {}
}

describe('UnitTestIoCLocator', () => {
    let mockRepo: MoqRepository;

    beforeEach(() => {
        mockRepo = new MoqRepository();
    });

    function createIoCLocator() {
        return new ServiceLocator(new IocInjector(metadataCollector), new MockHook(mockRepo));
    }

    it('ioc', () => {
        const locator = createIoCLocator();

        const { mock } = mockRepo.findOrCreate<ISubClass>('key1');
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = locator.resolve(TestClass1);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
