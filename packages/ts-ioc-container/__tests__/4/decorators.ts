import 'reflect-metadata';
import {
    constructor,
    createInjectFnDecorator,
    createMethodHookDecorator,
    InjectMetadataCollector,
    MethodsMetadataCollector,
    ProviderBuilder,
    ResolveDependency,
} from '../../lib';

export const injectMetadataCollector = new InjectMetadataCollector(Symbol.for('CONSTRUCTOR_METADATA_KEY'));
export const inject = createInjectFnDecorator(injectMetadataCollector);

export const onConstructMetadataCollector = new MethodsMetadataCollector(Symbol('OnConstructHook'));
export const onConstruct = createMethodHookDecorator(onConstructMetadataCollector);

export const onDisposeMetadataCollector = new MethodsMetadataCollector(Symbol('OnDisposeHook'));
export const onDispose = createMethodHookDecorator(onDisposeMetadataCollector);

export const instanceHook = {
    onConstruct(instance: unknown): void {
        if (!(instance instanceof Object)) {
            return;
        }

        onConstructMetadataCollector.invokeHooksOf(instance);
    },

    onDispose(instance: unknown): void {
        if (!(instance instanceof Object)) {
            return;
        }

        onDisposeMetadataCollector.invokeHooksOf(instance);
    },
};
