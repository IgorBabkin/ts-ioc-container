import { IProvider, IProviderRepository, ProviderKey, ProviderNotFoundError } from '../lib';
import { IMock } from 'moq.ts';
import { MockedProvider } from './MockedProvider';

export class MockRepository implements IProviderRepository {
    private mocks = new Map<ProviderKey, MockedProvider<any>>();
    constructor(private decorated: IProviderRepository) {}

    clone(): IProviderRepository {
        return this.decorated.clone(this);
    }
    dispose(): void {
        this.decorated.dispose();
        this.mocks.clear();
    }
    find<T>(key: ProviderKey): IProvider<T> {
        try {
            return this.decorated.find(key);
        } catch (e) {
            if (e instanceof ProviderNotFoundError) {
                return this.findProvider<T>(key as ProviderKey);
            }

            throw e;
        }
    }
    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        return this.decorated.add(key, provider);
    }

    findOrCreateMock<T>(key: ProviderKey): IMock<any> {
        return this.findProvider<T>(key).mock;
    }

    private findProvider<T>(key: ProviderKey): MockedProvider<T> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, new MockedProvider());
        }

        return this.mocks.get(key) as MockedProvider<T>;
    }
}
