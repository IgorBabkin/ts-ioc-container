import 'reflect-metadata';
import { ContainerBuilder, MockedServiceLocator } from '../../lib';
import { MoqRepository } from '../MoqRepository';
import { inject, IocInjector, withoutLogs as w } from '../ioc/IocInjector';

interface ISubClass {
    greeting(): string;
}

class TestClass1 {
    constructor(@inject(w((l) => l.resolve('key1'))) public dep1: ISubClass) {}
}

describe('UnitTestIoCLocator', () => {
    let mockRepository: MoqRepository;

    beforeEach(() => {
        mockRepository = new MoqRepository();
    });

    function createIoCLocator() {
        return new ContainerBuilder(new IocInjector())
            .mapLocator((l) => new MockedServiceLocator(l, mockRepository))
            .build();
    }

    it('ioc', () => {
        const locator = createIoCLocator();

        const mock = mockRepository.resolveMock<ISubClass>('key1');
        mock.setup((i) => i.greeting()).returns('hello');

        const key1 = locator.resolve(TestClass1);

        expect(key1.dep1.greeting()).toBe('hello');
    });
});
