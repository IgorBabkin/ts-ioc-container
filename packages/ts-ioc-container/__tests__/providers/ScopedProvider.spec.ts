import { IProvider, LevelProvider, Provider, SingletonProvider } from '../../lib';
import { Times } from 'moq.ts';
import { createMock } from '../MoqProviderStorage';

describe('ScopedProvider', function () {
    let provider: IProvider<any>;

    function createScopedProvider<T>(provider: IProvider<T>): IProvider<T> {
        return new LevelProvider(new SingletonProvider(provider), 1);
    }

    beforeEach(() => {
        provider = new Provider(() => 1);
    });

    test('cannot resolve dependency from scoped provider', () => {
        const scopedProvider = createScopedProvider(provider);

        expect(scopedProvider.isValid({ level: 0, tags: [] })).toBeFalsy();
    });

    test('can be cloned', () => {
        const scopedProvider = createScopedProvider(provider);

        expect(scopedProvider.clone({ level: 1 })).toBeDefined();
    });

    test('should be cloned as singleton', () => {
        const scopedProvider = createScopedProvider(provider);

        expect(scopedProvider.clone({ level: 1 })).toBeDefined();
    });

    test('dispose', () => {
        const providerMock = createMock<IProvider<any>>();

        const scopedProvider = createScopedProvider(providerMock.object());
        scopedProvider.dispose();

        providerMock.verify((i) => i.dispose(), Times.Once());
    });
});
