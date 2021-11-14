import { IKeyedProvider } from '../../core/IProvider';
import { constructor } from '../../helpers/types';

export type ProviderReducer<T> = (provider: IKeyedProvider<T>) => IKeyedProvider<T>;

export interface IProvidersMetadataCollector {
    addReducer<T>(target: constructor<T>, reducer: ProviderReducer<T>): void;

    findReducerOrCreate<T>(target: constructor<T>): ProviderReducer<T>;
}
