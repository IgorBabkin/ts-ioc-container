import {
    constructor,
    createAddKeysDecorator,
    createLevelDecorator,
    createSingletonDecorator,
    createTagsDecorator,
    ProvidersMetadataCollector,
    fromClass as fromConstructor,
} from '../../lib';

export const metadataCollector = ProvidersMetadataCollector.create();
export const singleton = createSingletonDecorator(metadataCollector);
export const addKeys = createAddKeysDecorator(metadataCollector);
export const level = createLevelDecorator(metadataCollector);
export const tags = createTagsDecorator(metadataCollector);

export const fromClass = <T>(target: constructor<T>) =>
    fromConstructor(target).map(metadataCollector.findReducerOrCreate(target));
