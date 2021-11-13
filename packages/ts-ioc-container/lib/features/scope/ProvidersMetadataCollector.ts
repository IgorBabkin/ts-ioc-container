import { IProvidersMetadataCollector } from './IProvidersMetadataCollector';
import { IProvider, ProviderKey } from '../../core/IProvider';
import { constructor } from '../../helpers/types';
import { Provider } from '../../core/Provider';
import { ProviderDecoratorNotFound } from '../../errors/ProviderNotFoundError';

export type ProviderReduce<T> = (provider: IProvider<T>) => IProvider<T>;

export class ProvidersMetadataCollector implements IProvidersMetadataCollector {
    private providers: Record<ProviderKey, IProvider<any>> = {};

    add(key: ProviderKey, target: constructor<unknown>): void {
        Reflect.defineMetadata('providerKey', key, target);
        this.providers[key] = Provider.fromConstructor(target as any as constructor<any>);
    }

    update<T>(target: constructor<T>, reduce: ProviderReduce<T>): void {
        if (!Reflect.hasMetadata('providerKey', target)) {
            throw new ProviderDecoratorNotFound(target.name);
        }

        const key = Reflect.getMetadata('providerKey', target);
        this.providers[key] = reduce(this.providers[key] as IProvider<any>);
    }

    getProviders(): Record<ProviderKey, IProvider<any>> {
        return this.providers;
    }
}
