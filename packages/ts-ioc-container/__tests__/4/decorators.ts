import { createMethodHookDecorator, MethodsMetadataCollector } from '../../lib';

export const onConstructMetadataCollector = new MethodsMetadataCollector(Symbol('OnConstructHook'));
export const onConstruct = createMethodHookDecorator(onConstructMetadataCollector);

export const onDisposeMetadataCollector = new MethodsMetadataCollector(Symbol('OnDisposeHook'));
export const onDispose = createMethodHookDecorator(onDisposeMetadataCollector);
