import { createMethodHookDecorator, MethodReflector } from '../../lib';

export const onConstructMetadataCollector = new MethodReflector('OnConstructHook');
export const onConstruct = createMethodHookDecorator(onConstructMetadataCollector);

export const onDisposeMetadataCollector = new MethodReflector('OnDisposeHook');
export const onDispose = createMethodHookDecorator(onDisposeMetadataCollector);
