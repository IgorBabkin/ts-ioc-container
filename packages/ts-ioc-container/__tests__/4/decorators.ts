import { createMethodHookDecorator, MethodsMetadataCollector } from '../../lib';

export const onConstructMetadataCollector = new MethodsMetadataCollector('OnConstructHook');
export const onConstruct = createMethodHookDecorator(onConstructMetadataCollector);

export const onDisposeMetadataCollector = new MethodsMetadataCollector('OnDisposeHook');
export const onDispose = createMethodHookDecorator(onDisposeMetadataCollector);
