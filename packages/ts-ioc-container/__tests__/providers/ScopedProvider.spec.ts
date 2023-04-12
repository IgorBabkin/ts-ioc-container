import { IProvider, Provider, SingletonProvider, TaggedProvider } from '../../lib';
import { Times } from 'moq.ts';
import { createMock } from '../MoqRepository';

describe('ScopedProvider', function () {
    let provider: IProvider<any>;

    function createScopedProvider<T>(provider: IProvider<T>): IProvider<T> {
        return new TaggedProvider(new SingletonProvider(provider), ['child']);
    }

    beforeEach(() => {
        provider = new Provider(() => 1);
    });

    test('cannot resolve dependency from scoped provider', () => {
        const scopedProvider = createScopedProvider(provider);

        expect(scopedProvider.isValid({ tags: ['root'] })).toBeFalsy();
    });

    test('can be cloned', () => {
        const scopedProvider = createScopedProvider(provider);

        expect(scopedProvider.isValid({ tags: ['child'] })).toBeTruthy();
    });

    test('dispose', () => {
        const providerMock = createMock<IProvider<any>>();

        const scopedProvider = createScopedProvider(providerMock.object());
        scopedProvider.dispose();

        providerMock.verify((i) => i.dispose(), Times.Once());
    });
});
