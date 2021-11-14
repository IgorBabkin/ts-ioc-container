import { constructor } from '../../helpers/types';
import { IKeyedProvider } from '../../core/provider/IProvider';

export type ProviderReducer<T> = (provider: IKeyedProvider<T>) => IKeyedProvider<T>;

export interface IProvidersMetadataCollector {
    addReducer<T>(target: constructor<T>, reducer: ProviderReducer<T>): void;

    findReducerOrCreate<T>(target: constructor<T>): ProviderReducer<T>;
}
