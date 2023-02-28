import { MethodReflector } from '../../lib';

export const onConstructMetadataCollector = new MethodReflector('OnConstructHook');
export const onConstruct = onConstructMetadataCollector.createMethodHookDecorator();

export const onDisposeMetadataCollector = new MethodReflector('OnDisposeHook');
export const onDispose = onDisposeMetadataCollector.createMethodHookDecorator();
