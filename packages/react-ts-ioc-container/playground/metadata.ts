import { MethodsMetadataCollector } from 'ts-ioc-container';

export const onDisposeMetadataCollector = new MethodsMetadataCollector(Symbol.for('onDispose'));
