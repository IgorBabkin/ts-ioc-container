import { createMethodHookDecorator, MethodsMetadataCollector } from '../../lib';

export const onConstructMetadataCollector = new MethodsMetadataCollector(Symbol.for('OnConstructHook'));
export const onConstruct = createMethodHookDecorator(onConstructMetadataCollector);
