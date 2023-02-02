import 'reflect-metadata';
import { MockedServiceLocator, Container } from '../../lib';
import { MoqRepository } from '../MoqRepository';
import { inject, IocInjector } from '../ioc/IocInjector';

interface ISubClass {
    greeting(): string;
}

class TestClass1 {
    constructor(@inject((l) => l.resolve('key1')) public dep1: ISubClass) {}
}

describe('UnitTestIoCLocator', () => {
    let mockRepository: MoqRepository;

    beforeEach(() => {
        mockRepository = new MoqRepository();
    });

    function createIoCLocator() {
        const locator = new Container(new IocInjector()).map((l) => new MockedServiceLocator(l, mockRepository));
        return new MockedServiceLocator(locator, mockRepository);
    }

    it('ioc', () => {
        const container = createIoCLocator();
        const mock = mockRepository.resolveMock<ISubClass>('key1');
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = container.resolve(TestClass1);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
