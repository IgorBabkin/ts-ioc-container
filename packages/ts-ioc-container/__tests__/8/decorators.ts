import { createMethodHookDecorator, MethodReflector } from '../../lib';

export const onConstructMetadataCollector = new MethodReflector(Symbol.for('OnConstructHook'));
export const onConstruct = createMethodHookDecorator(onConstructMetadataCollector);
