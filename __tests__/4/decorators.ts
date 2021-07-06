import 'reflect-metadata';
import {
    constructor,
    ConstructorMetadataCollector,
    IInstanceHook,
    InjectFn,
    MethodsMetadataCollector,
    ProviderBuilder,
    ProviderFn,
} from '../../lib';

export const constructorMetadataCollector = new ConstructorMetadataCollector();
export const inject =
    <T>(injectionFn: InjectFn<T>): ParameterDecorator =>
    (target, propertyKey, parameterIndex) => {
        constructorMetadataCollector.addMetadata(target, parameterIndex, injectionFn);
    };

export const onConstructMetadataCollector = new MethodsMetadataCollector(Symbol('OnConstructHook'));
export const onConstruct: MethodDecorator = (target, propertyKey) => {
    // eslint-disable-next-line @typescript-eslint/ban-types
    onConstructMetadataCollector.addHook(target, propertyKey);
};

export const onDisposeMetadataCollector = new MethodsMetadataCollector(Symbol('OnDisposeHook'));
export const onDispose: MethodDecorator = (target, propertyKey) => {
    // eslint-disable-next-line @typescript-eslint/ban-types
    onDisposeMetadataCollector.addHook(target, propertyKey);
};

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

export const fromFn = <T>(fn: ProviderFn<T>): ProviderBuilder<T> => new ProviderBuilder(fn).withHook(instanceHook);
export const fromInstance = <T>(instance: T): ProviderBuilder<T> =>
    ProviderBuilder.fromInstance(instance).withHook(instanceHook);
export const fromConstructor = <T>(value: constructor<T>): ProviderBuilder<T> =>
    ProviderBuilder.fromConstructor(value).withHook(instanceHook);
