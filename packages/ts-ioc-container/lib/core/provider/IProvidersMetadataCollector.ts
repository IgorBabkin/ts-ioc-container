import { constructor } from '../utils/types';
import { ProviderBuilder } from '../../providers/ProviderBuilder';

export type ProviderReducer<T> = (builder: ProviderBuilder<T>) => ProviderBuilder<T>;

export interface IProvidersMetadataCollector {
    addReducer<T>(target: constructor<T>, reducer: ProviderReducer<T>): void;

    findReducerOrCreate<T>(target: constructor<T>): ProviderReducer<T>;
}
