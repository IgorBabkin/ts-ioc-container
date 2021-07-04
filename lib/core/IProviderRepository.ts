import { IProvider, ProviderKey } from './providers/IProvider';

export interface IProviderRepository {
    clone(parent?: IProviderRepository): IProviderRepository;

    dispose(): void;

    find<T>(key: ProviderKey): IProvider<T>;

    add<T>(key: ProviderKey, provider: IProvider<T>): void;
}
