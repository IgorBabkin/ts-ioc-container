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
import { CachedResolvableHook, IInstanceHook } from '../../lib/features/instanceHook/IResolvableHook';

export const injectMetadataCollector = new InjectMetadataCollector(Symbol.for('CONSTRUCTOR_METADATA_KEY'));
export const inject = createInjectFnDecorator(injectMetadataCollector);

export const onConstructMetadataCollector = new MethodsMetadataCollector(Symbol('OnConstructHook'));
export const onConstruct = createMethodHookDecorator(onConstructMetadataCollector);

export const onDisposeMetadataCollector = new MethodsMetadataCollector(Symbol('OnDisposeHook'));
export const onDispose = createMethodHookDecorator(onDisposeMetadataCollector);

export const instanceHook = new CachedResolvableHook({
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
});

export const fromFn = <T>(fn: ResolveDependency<T>): ProviderBuilder<T> => ProviderBuilder.fromFn(fn);
export const fromValue = <T>(instance: T): ProviderBuilder<T> => ProviderBuilder.fromValue(instance);
export const fromClass = <T>(value: constructor<T>): ProviderBuilder<T> =>
    ProviderBuilder.fromClass(value).withHook(instanceHook);
