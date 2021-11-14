import { IProviderRepository, ProviderKey, ProviderNotFoundError, Tag } from '../../index';
import { IMockProviderStorage } from './IMockProviderStorage';
import { MethodNotImplementedError } from '../../errors/MethodNotImplementedError';
import { IProvider } from '../../core/provider/IProvider';

export class MockedRepository implements IProviderRepository {
    constructor(protected decorated: IProviderRepository, private mockProviders: IMockProviderStorage) {}

    get level(): number {
        return this.decorated.level;
    }

    get tags(): Tag[] {
        return this.decorated.tags;
    }

    dispose(): void {
        this.decorated.dispose();
        this.mockProviders.dispose();
    }

    find<T>(key: ProviderKey): IProvider<T> {
        try {
            return this.decorated.find(key);
        } catch (e) {
            if (e instanceof ProviderNotFoundError) {
                return this.mockProviders.findOrCreate<T>(key);
            }

            throw e;
        }
    }

    add<T>(key: ProviderKey, provider: IProvider<T>): void {
        this.decorated.add(key, provider);
    }

    clone(): IProviderRepository {
        throw new MethodNotImplementedError('MockRepository cannot be cloned');
    }

    entries(): Array<[ProviderKey, IProvider<any>]> {
        return this.decorated.entries();
    }
}
