import {
    constructor,
    createLevelDecorator,
    createSingletonDecorator,
    createTagsDecorator,
    ProviderBuilder,
    ProvidersMetadataCollector,
} from '../../lib';

export const metadataCollector = ProvidersMetadataCollector.create();
export const singleton = createSingletonDecorator(metadataCollector);
export const level = createLevelDecorator(metadataCollector);
export const tags = createTagsDecorator(metadataCollector);

export const fromClass = <T>(target: constructor<T>) =>
    ProviderBuilder.fromClass(target).withReducer(metadataCollector.findReducerOrCreate(target));
