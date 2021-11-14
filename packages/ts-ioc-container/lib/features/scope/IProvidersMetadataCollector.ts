import { IProvider } from '../../core/IProvider';
import { constructor } from '../../helpers/types';

export type ProviderReducer<T> = (provider: IProvider<T>) => IProvider<T>;

export interface IProvidersMetadataCollector {
    addReducer<T>(target: constructor<T>, reducer: ProviderReducer<T>): void;

    findReducerOrCreate<T>(target: constructor<T>): ProviderReducer<T>;
}
