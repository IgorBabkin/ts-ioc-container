import {
    IProvider,
    IServiceLocator,
    Provider,
    ProviderNotResolvedError,
    ProviderRepository,
    ScopedProvider,
    ServiceLocator,
    SimpleInjector,
    SingletonProvider,
} from '../../lib';
import { createMock } from '../MoqProvider';
import { Times } from 'moq.ts';

describe('ScopedProvider', function () {
    let locator: IServiceLocator;
    let provider: IProvider<any>;

    beforeEach(() => {
        locator = new ServiceLocator(() => new SimpleInjector(), new ProviderRepository());
        provider = new Provider(() => 1);
    });

    test('cannot resolve dependency from scoped provider', () => {
        const scopedProvider = new ScopedProvider(provider);

        expect(() => scopedProvider.resolve(locator)).toThrow(ProviderNotResolvedError);
    });

    test('can be cloned', () => {
        const scopedProvider = new ScopedProvider(provider);

        expect(scopedProvider.clone()).toBeDefined();
    });

    test('should be cloned as singleton', () => {
        const scopedProvider = new ScopedProvider(provider);

        expect(scopedProvider.clone()).toBeInstanceOf(SingletonProvider);
    });

    test('dispose', () => {
        const providerMock = createMock<IProvider<any>>();

        const scopedProvider = new ScopedProvider(providerMock.object());
        scopedProvider.dispose();

        providerMock.verify((i) => i.dispose(), Times.Once());
    });
});
