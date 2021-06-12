import { Hook, IServiceLocator, MockHook, ServiceLocator, SimpleInjector } from '../lib';
import { MoqRepository } from './MoqRepository';

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
    let mockRepo: MoqRepository;

    beforeEach(() => {
        mockRepo = new MoqRepository();
    });

    function createSimpleLocator() {
        return new ServiceLocator(
            {
                create: (locator) => new SimpleInjector(locator),
            },
            {
                create: () => new MockHook(new Hook([]), mockRepo),
            },
        );
    }

    it('hey', () => {
        const locator = createSimpleLocator();

        const { mock } = mockRepo.findOrCreate<IDepClass>('key1');
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = locator.resolve(TestClass);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
