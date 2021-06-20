import 'reflect-metadata';
import {
    ConstructorMetadataCollector,
    IInstanceHook,
    InjectFn,
    InstanceHookProvider,
    IProvider,
    IProviderOptions,
    MethodsMetadataCollector,
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

export const instanceHook: IInstanceHook = {
    onConstruct<GInstance>(instance: GInstance) {
        if (!(instance instanceof Object)) {
            return;
        }

        onConstructMetadataCollector.invokeHooksOf<GInstance>(instance);
    },
    onDispose<GInstance>(instance: GInstance) {},
};

export const createProvider = <T>(fn: ProviderFn<T>, options: IProviderOptions): IProvider<T> =>
    new InstanceHookProvider(fn, options, instanceHook);
