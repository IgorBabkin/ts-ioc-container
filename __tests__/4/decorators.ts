import 'reflect-metadata';
import {
    constructor,
    ConstructorMetadataCollector,
    IProvider,
    IProviderOptions,
    MethodsMetadataCollector,
    ProviderFn,
} from '../../lib';
import { InjectFn } from '../../lib/features/injectors/ioc/InjectFn';
import { IInstanceHook } from '../../lib/hooks/IInstanceHook';
import { InstanceHookProvider } from '../../lib/features/provider/InstanceHookProvider';

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

        onDisposeMetadataCollector.invokeHooksOf(instance);
    },
};

const createProvider = <T>(fn: ProviderFn<T>, options: IProviderOptions) =>
    new InstanceHookProvider(fn, options, instanceHook);
export const fromFn = <T>(fn: ProviderFn<T>, options: IProviderOptions = { resolving: 'perRequest' }): IProvider<T> =>
    createProvider(fn, options);
export const fromInstance = <T>(instance: T, options: IProviderOptions = { resolving: 'perRequest' }): IProvider<T> =>
    createProvider(() => instance, options);
export const fromConstructor = <T>(
    value: constructor<T>,
    options: IProviderOptions = { resolving: 'perRequest' },
): IProvider<T> => createProvider((l, ...args) => l.resolve(value, ...args), options);
