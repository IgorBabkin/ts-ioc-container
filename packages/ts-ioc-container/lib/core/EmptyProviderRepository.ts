import { IKeyedProvider, ProviderKey, Tag } from './IProvider';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { ProviderNotFoundError } from '../errors/ProviderNotFoundError';
import { IProviderRepository } from './IProviderRepository';

export class EmptyProviderRepository implements IProviderRepository {
    level = -1;
    tags: Tag[] = [];

    add(): void {
        throw new MethodNotImplementedError();
    }

    clone(): IProviderRepository {
        throw new MethodNotImplementedError();
    }

    dispose(): void {
        throw new MethodNotImplementedError();
    }

    entries(): Array<[ProviderKey, IKeyedProvider<any>]> {
        return [];
    }

    find<T>(key: ProviderKey): IKeyedProvider<T> {
        throw new ProviderNotFoundError(key.toString());
    }
}
