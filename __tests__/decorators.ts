import 'reflect-metadata';
import {
    createInjectDecorator,
    createOnConstructDecorator,
    createOnDisposeDecorator,
    HooksMetadataCollector,
    MetadataCollector,
} from '../lib';

export const metadataCollector = new MetadataCollector();
export const hooksMetadataCollector = new HooksMetadataCollector();

export const inject = createInjectDecorator(metadataCollector);
export const onConstruct = createOnConstructDecorator(hooksMetadataCollector);
export const onDispose = createOnDisposeDecorator(hooksMetadataCollector);
