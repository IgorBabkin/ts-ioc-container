import { IProvider, IServiceLocator, LevelProvider, Provider, RangeType, SingletonProvider } from '../../lib';
import { Times } from 'moq.ts';
import { createMock } from '../MoqProviderStorage';

describe('LastScopedProvider', function () {
    function createLastScopedProvider<T>(provider: IProvider<T>) {
        return new LevelProvider(new SingletonProvider(provider), new RangeType([0, Infinity]));
    }

    test('resolve dependency from scoped provider', () => {
        const scopedProvider = createLastScopedProvider(new Provider(() => 1));

        expect(scopedProvider.isValid({ level: 0 })).toBe(1);
    });

    test('should be singleton per scope', () => {
        const locator = {} as IServiceLocator;

        const scopedProvider = createLastScopedProvider(new Provider(() => Math.random()));
        const dep1 = scopedProvider.resolve(locator);
        const dep2 = scopedProvider.resolve(locator);

        expect(dep1).toBe(dep2);
    });

    test('can be cloned', () => {
        const scopedProvider = createLastScopedProvider(new Provider(() => 1));

        expect(scopedProvider.clone({ level: 0 })).toBeDefined();
    });

    test('should be cloned as every scoped', () => {
        const scopedProvider = createLastScopedProvider(new Provider(() => 1));

        expect(scopedProvider.clone({ level: 0 })).toBeInstanceOf(LevelProvider);
    });

    test('dispose', () => {
        const providerMock = createMock<IProvider<any>>();

        const scopedProvider = createLastScopedProvider(providerMock.object());
        scopedProvider.dispose();

        providerMock.verify((i) => i.dispose(), Times.Once());
    });
});
