import 'reflect-metadata';
import {
    constructor,
    createHookDecorator,
    createInjectFnDecorator,
    IInstanceHook,
    InjectMetadataCollector,
    MethodsMetadataCollector,
    ProviderBuilder,
    ResolveDependency,
} from '../../lib';

export const injectMetadataCollector = new InjectMetadataCollector(Symbol.for('CONSTRUCTOR_METADATA_KEY'));
export const inject = createInjectFnDecorator(injectMetadataCollector);

export const onConstructMetadataCollector = new MethodsMetadataCollector(Symbol('OnConstructHook'));
export const onConstruct = createHookDecorator(onConstructMetadataCollector);

export const onDisposeMetadataCollector = new MethodsMetadataCollector(Symbol('OnDisposeHook'));
export const onDispose = createHookDecorator(onDisposeMetadataCollector);

export const instanceHook: IInstanceHook = {
    onConstruct<GInstance>(instance: GInstance) {
        if (!(instance instanceof Object)) {
            return;
        }

        onConstructMetadataCollector.invokeHooksOf<GInstance>(instance);
    },
    onDispose<GInstance>(instance: GInstance) {
        if (!(instance instanceof Object)) {
            return;
        }

        onDisposeMetadataCollector.invokeHooksOf<GInstance>(instance);
    },
};

export const fromFn = <T>(fn: ResolveDependency<T>): ProviderBuilder<T> => ProviderBuilder.fromFn(fn);
export const fromInstance = <T>(instance: T): ProviderBuilder<T> => ProviderBuilder.fromValue(instance);
export const fromConstructor = <T>(value: constructor<T>): ProviderBuilder<T> => ProviderBuilder.fromClass(value);
