import { IProvider, ProviderKey } from '../../core/IProvider';
import { constructor } from '../../helpers/types';

type ProviderReduce<T> = (provider: IProvider<T>) => IProvider<T>;
export interface IProvidersMetadataCollector {
    add(key: ProviderKey, target: constructor<unknown>): void;
    update<T>(target: constructor<T>, reduce: ProviderReduce<T>): void;
}
