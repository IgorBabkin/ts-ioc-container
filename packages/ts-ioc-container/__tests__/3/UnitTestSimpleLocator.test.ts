import {
    IServiceLocator,
    MockedRepository,
    MockProviderStorage,
    ProviderRepository,
    ServiceLocator,
    SimpleInjector,
} from '../../lib';
import { MoqProvider, MoqProviderStorage } from '../MoqProviderStorage';

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
    let mockStorage: MoqProviderStorage;

    beforeEach(() => {
        mockStorage = new MoqProviderStorage(new MockProviderStorage(() => new MoqProvider()));
    });

    function createSimpleLocator() {
        return new ServiceLocator(new SimpleInjector(), new MockedRepository(ProviderRepository.root(), mockStorage));
    }

    it('hey', () => {
        const locator = createSimpleLocator();

        const mock = mockStorage.findMock<IDepClass>('key1');
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = locator.resolve(TestClass);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
