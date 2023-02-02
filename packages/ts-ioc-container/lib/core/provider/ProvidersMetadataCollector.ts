import { IProvidersMetadataCollector, ProviderReducer } from './IProvidersMetadataCollector';
import { constructor } from '../utils/types';
import { id } from '../utils/others';

export class ProvidersMetadataCollector implements IProvidersMetadataCollector {
    static create(): ProvidersMetadataCollector {
        return new ProvidersMetadataCollector(Symbol('providerReducer'), () => id);
    }

    constructor(private metadataKey: string | symbol, private createReducer: () => ProviderReducer<unknown>) {}

    findReducerOrCreate<T>(target: constructor<T>): ProviderReducer<T> {
        if (!Reflect.hasMetadata(this.metadataKey, target)) {
            Reflect.defineMetadata(this.metadataKey, this.createReducer(), target);
        }
        return Reflect.getMetadata(this.metadataKey, target);
    }

    addReducer<T>(target: constructor<T>, reducer: ProviderReducer<T>): void {
        Reflect.defineMetadata(this.metadataKey, reducer, target);
    }
}
