import 'reflect-metadata';
import { MockedServiceContainer, Container } from '../../lib';
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
        return new Container(new IocInjector()).map((l) => new MockedServiceContainer(l, mockRepository));
    }

    it('ioc', () => {
        const locator = createIoCLocator();

        const mock = mockRepository.resolveMock<ISubClass>('key1');
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = locator.resolve(TestClass1);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
