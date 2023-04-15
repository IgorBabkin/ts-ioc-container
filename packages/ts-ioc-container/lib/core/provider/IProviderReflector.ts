import { constructor } from '../utils/types';
import { RegistrationBuilder } from '../../providers/RegistrationBuilder';

export type ProviderReducer<T> = (builder: RegistrationBuilder<T>) => RegistrationBuilder<T>;

export interface IProviderReflector {
    addReducer<T>(target: constructor<T>, reducer: ProviderReducer<T>): void;

    findReducerOrCreate<T>(target: constructor<T>): ProviderReducer<T>;
}
