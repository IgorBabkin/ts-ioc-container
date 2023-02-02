import { IContainer, MockedServiceLocator, Container, SimpleInjector } from '../../lib';
import { MoqRepository } from '../MoqRepository';

interface IDepClass {
    greeting(): string;
}

class TestClass {
    dep1: IDepClass;

    constructor(l: IContainer) {
        this.dep1 = l.resolve('key1');
    }
}

describe('UnitTestSimpleLocator', () => {
    let mockRepository: MoqRepository;

    beforeEach(() => {
        mockRepository = new MoqRepository();
    });

    function createSimpleLocator() {
        return new Container(new SimpleInjector()).map((l) => new MockedServiceLocator(l, mockRepository));
    }

    it('hey', () => {
        const locator = createSimpleLocator();

        const mock = mockRepository.resolveMock<IDepClass>('key1');
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = locator.resolve(TestClass);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
