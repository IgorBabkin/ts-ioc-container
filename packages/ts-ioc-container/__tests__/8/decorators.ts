import 'reflect-metadata';
import {
    createHookDecorator,
    createInjectFnDecorator,
    InjectMetadataCollector,
    MethodsMetadataCollector,
} from '../../lib';

export const constructorMetadataCollector = new InjectMetadataCollector(Symbol.for('CONSTRUCTOR_METADATA_KEY'));
export const inject = createInjectFnDecorator(constructorMetadataCollector);

export const onConstructMetadataCollector = new MethodsMetadataCollector(Symbol('OnConstructHook'));
export const onConstruct = createHookDecorator(onConstructMetadataCollector);