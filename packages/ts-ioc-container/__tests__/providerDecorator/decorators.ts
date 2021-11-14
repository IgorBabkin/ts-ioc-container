import {
    constructor,
    createLevelDecorator,
    createSingletonDecorator,
    createTagsDecorator,
    ProviderBuilder,
    ProvidersMetadataCollector,
} from '../../lib';
import { createAddKeysDecorator } from '../../lib/features/scope/decorators';

export const metadataCollector = ProvidersMetadataCollector.create();
export const singleton = createSingletonDecorator(metadataCollector);
export const addKeys = createAddKeysDecorator(metadataCollector);
export const level = createLevelDecorator(metadataCollector);
export const tags = createTagsDecorator(metadataCollector);

export const fromClass = <T>(target: constructor<T>) =>
    ProviderBuilder.fromClass(target).withReducer(metadataCollector.findReducerOrCreate(target));
