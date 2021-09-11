import { IProvider, IProviderRepository, ProviderKey, ProviderNotFoundError } from '../../index';
import { IMock } from 'moq.ts';
import { IMockProvider } from './IMockProvider';

export abstract class MockRepository implements IProviderRepository {
    private readonly mocks = new Map<ProviderKey, IMockProvider<any>>();

    constructor(protected readonly decorated: IProviderRepository) {}

    dispose(): void {
        this.decorated.dispose();
        this.mocks.clear();
    }

    find<T>(key: ProviderKey): IProvider<T> {
        try {
            return this.decorated.find(key);
        } catch (e) {
            if (e instanceof ProviderNotFoundError) {
                return this.findOrCreateProvider(key);
            }

            throw e;
        }
    }

    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        this.decorated.add(key, provider);
    }

    findMock<T>(key: ProviderKey): IMock<T> {
        return this.findOrCreateProvider<T>(key).getMock();
    }

    abstract clone(parent?: IProviderRepository): IProviderRepository;

    private findOrCreateProvider<T>(key: ProviderKey): IMockProvider<T> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, this.createMockProvider<T>());
        }

        return this.mocks.get(key) as IMockProvider<T>;
    }

    protected abstract createMockProvider<T>(): IMockProvider<T>;
}
