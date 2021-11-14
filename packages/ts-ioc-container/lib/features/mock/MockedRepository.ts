import { IKeyedProvider, IProviderRepository, ProviderKey, ProviderNotFoundError, Tag } from '../../index';
import { IMockProviderStorage } from './IMockProviderStorage';
import { MethodNotImplementedError } from '../../errors/MethodNotImplementedError';

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

    find<T>(key: ProviderKey): IKeyedProvider<T> {
        try {
            return this.decorated.find(key);
        } catch (e) {
            if (e instanceof ProviderNotFoundError) {
                return this.mockProviders.findOrCreate<T>(key);
            }

            throw e;
        }
    }

    add<T>(key: ProviderKey, provider: IKeyedProvider<T>): void {
        this.decorated.add(key, provider);
    }

    clone(): IProviderRepository {
        throw new MethodNotImplementedError('MockRepository cannot be cloned');
    }

    entries(): Array<[ProviderKey, IKeyedProvider<any>]> {
        return this.decorated.entries();
    }
}
