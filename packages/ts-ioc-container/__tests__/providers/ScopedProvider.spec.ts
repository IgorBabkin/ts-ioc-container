import { IKeyedProvider, LevelProvider, Provider, SingletonProvider } from '../../lib';
import { Times } from 'moq.ts';
import { createMock } from '../MockedServiceLocator';

describe('ScopedProvider', function () {
    let provider: IKeyedProvider<any>;

    function createScopedProvider<T>(provider: IKeyedProvider<T>): IKeyedProvider<T> {
        return new LevelProvider(new SingletonProvider(provider), [1, 1]);
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

        expect(scopedProvider.isValid({ level: 1, tags: [] })).toBeTruthy();
    });

    test('dispose', () => {
        const providerMock = createMock<IKeyedProvider<any>>();

        const scopedProvider = createScopedProvider(providerMock.object());
        scopedProvider.dispose();

        providerMock.verify((i) => i.dispose(), Times.Once());
    });
});
