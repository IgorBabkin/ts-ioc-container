import { EveryScopeProvider, IProvider, IServiceLocator, Provider } from '../../lib';
import { Times } from 'moq.ts';
import { createMock } from '../MoqProviderStorage';

describe('LastScopedProvider', function () {
    test('resolve dependency from scoped provider', () => {
        const scopedProvider = new EveryScopeProvider(new Provider(() => 1));

        expect(scopedProvider.resolve({} as IServiceLocator)).toBe(1);
    });

    test('should be singleton per scope', () => {
        const locator = {} as IServiceLocator;

        const scopedProvider = new EveryScopeProvider(new Provider(() => Math.random()));
        const dep1 = scopedProvider.resolve(locator);
        const dep2 = scopedProvider.resolve(locator);

        expect(dep1).toBe(dep2);
    });

    test('can be cloned', () => {
        const scopedProvider = new EveryScopeProvider(new Provider(() => 1));

        expect(scopedProvider.clone()).toBeDefined();
    });

    test('should be cloned as every scoped', () => {
        const scopedProvider = new EveryScopeProvider(new Provider(() => 1));

        expect(scopedProvider.clone()).toBeInstanceOf(EveryScopeProvider);
    });

    test('dispose', () => {
        const providerMock = createMock<IProvider<any>>();

        const scopedProvider = new EveryScopeProvider(providerMock.object());
        scopedProvider.dispose();

        providerMock.verify((i) => i.dispose(), Times.Once());
    });
});
