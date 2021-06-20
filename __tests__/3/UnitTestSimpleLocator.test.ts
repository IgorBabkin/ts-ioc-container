import { IServiceLocator, ProviderRepository, ServiceLocator, SimpleInjector } from '../../lib';
import { MockRepository } from '../MockRepository';

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
    let mockRepo: MockRepository;

    beforeEach(() => {
        mockRepo = new MockRepository(new ProviderRepository());
    });

    function createSimpleLocator() {
        return new ServiceLocator(new SimpleInjector(), mockRepo);
    }

    it('hey', () => {
        const locator = createSimpleLocator();

        const mock = mockRepo.findOrCreateMock<IDepClass>('key1');
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = locator.resolve(TestClass);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
