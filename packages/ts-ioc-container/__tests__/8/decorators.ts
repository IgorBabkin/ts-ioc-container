import { MethodReflector } from '../../lib';

export const onConstructMetadataCollector = new MethodReflector(Symbol('OnConstructHook'));
export const onConstruct = onConstructMetadataCollector.createMethodHookDecorator();
