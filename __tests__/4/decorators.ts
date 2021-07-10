import 'reflect-metadata';
import { constructor, IInstanceHook, InjectFn, ProviderBuilder, ProviderFn } from '../../lib';
import { ConstructorMetadataCollector, MethodsMetadataCollector } from '../../lib/metadata';

export const constructorMetadataCollector = new ConstructorMetadataCollector();
export const inject = createInjectFnDecorator(constructorMetadataCollector);

export const onConstructMetadataCollector = new MethodsMetadataCollector(Symbol('OnConstructHook'));
export const onConstruct: MethodDecorator = createHookDecorator(onConstructMetadataCollector);

export const onDisposeMetadataCollector = new MethodsMetadataCollector(Symbol('OnDisposeHook'));
export const onDispose: MethodDecorator = createHookDecorator(onDisposeMetadataCollector);

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

export const fromFn = <T>(fn: ProviderFn<T>): ProviderBuilder<T> => new ProviderBuilder(fn);
export const fromInstance = <T>(instance: T): ProviderBuilder<T> => ProviderBuilder.fromInstance(instance);
export const fromConstructor = <T>(value: constructor<T>): ProviderBuilder<T> => ProviderBuilder.fromConstructor(value);
