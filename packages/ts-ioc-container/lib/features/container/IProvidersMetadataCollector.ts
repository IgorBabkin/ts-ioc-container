import {constructor} from '../../helpers/types';
import {ProviderBuilder} from "./ProviderBuilder";

export type ProviderReducer<T> = (builder: ProviderBuilder<T>) => ProviderBuilder<T>;

export interface IProvidersMetadataCollector {
    addReducer<T>(target: constructor<T>, reducer: ProviderReducer<T>): void;

    findReducerOrCreate<T>(target: constructor<T>): ProviderReducer<T>;
}
