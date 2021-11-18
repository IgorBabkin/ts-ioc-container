import 'reflect-metadata';
import { ContainerBuilder, IocInjector, MockedServiceLocator } from '../../lib';
import { inject } from './decorators';
import { injectMetadataCollector } from '../1/decorators';
import { MoqRepository } from '../MoqRepository';

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
        return new ContainerBuilder(new IocInjector(injectMetadataCollector))
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
