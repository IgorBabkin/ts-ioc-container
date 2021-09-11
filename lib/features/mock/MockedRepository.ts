import { IProvider, IProviderRepository, ProviderKey, ProviderNotFoundError } from '../../index';
import { IMockStorage } from './IMockStorage';
import { MethodNotImplementedError } from '../../errors/MethodNotImplementedError';

export class MockedRepository implements IProviderRepository {
    constructor(protected decorated: IProviderRepository, private mocks: IMockStorage) {}

    dispose(): void {
        this.decorated.dispose();
        this.mocks.dispose();
    }

    find<T>(key: ProviderKey): IProvider<T> {
        try {
            return this.decorated.find(key);
        } catch (e) {
            if (e instanceof ProviderNotFoundError) {
                return this.mocks.findOrCreate<T>(key);
            }

            throw e;
        }
    }

    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        this.decorated.add(key, provider);
    }

    clone(parent?: IProviderRepository): IProviderRepository {
        throw new MethodNotImplementedError('MockRepository cannot be cloned');
    }
}
