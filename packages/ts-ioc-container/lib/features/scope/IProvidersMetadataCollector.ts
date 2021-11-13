import { constructor, ProviderKey } from '../../lib';
import { ProviderReduce } from './UnitTestIoCLocator3.test';

export interface IProvidersMetadataCollector {
    add(key: ProviderKey, target: constructor<unknown>): void;
    update<T>(target: constructor<T>, reduce: ProviderReduce<T>): void;
}
