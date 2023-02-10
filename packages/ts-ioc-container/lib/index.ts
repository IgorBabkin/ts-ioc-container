import { createAddKeyDecorator, Provider } from './core/provider/Provider';
import { ProvidersMetadataCollector } from './core/provider/ProvidersMetadataCollector';
import { createSingletonDecorator } from './providers/SingletonProvider';
import { createTagsDecorator } from './providers/TaggedProvider';
import { constructor } from './core/utils/types';
import { ProviderBuilder } from './providers/ProviderBuilder';
import { ResolveDependency } from './core/provider/IProvider';
import { IContainer, InjectionToken } from './core/container/IContainer';

export { ContainerHook } from './hooks/ContainerHook';
export { ProviderReducer } from './core/provider/IProvidersMetadataCollector';
export { IContainer, Resolveable } from './core/container/IContainer';
export { constructor } from './core/utils/types';
export { Container } from './core/container/Container';
export { ScopeOptions, ResolveDependency, Tag, IProvider } from './core/provider/IProvider';
export { IInjector } from './core/IInjector';
export { SimpleInjector } from './injectors/SimpleInjector';
export { IMethodsMetadataCollector } from './hooks/IMethodsMetadataCollector';
export { MethodsMetadataCollector } from './hooks/MethodsMetadataCollector';
export { InjectionToken } from './core/container/IContainer';
export { ProviderNotFoundError } from './core/provider/ProviderNotFoundError';
export { MethodNotImplementedError } from './core/utils/MethodNotImplementedError';
export { ContainerDisposedError } from './core/container/ContainerDisposedError';
export { Provider } from './core/provider/Provider';
export { ArgsProvider, ArgsFn, createArgsFnDecorator } from './providers/ArgsProvider';
export { IContainerHook } from './core/container/IContainerHook';
export { TaggedProvider } from './providers/TaggedProvider';
export { ProxyInjector } from './injectors/ProxyInjector';
export { LevelProvider, createLevelDecorator } from './providers/LevelProvider';
export { IMockRepository } from './automock/IMockRepository';
export { AutoMockedContainer } from './automock/AutoMockedContainer';
export { SingletonProvider } from './providers/SingletonProvider';
export { ProviderBuilder } from './providers/ProviderBuilder';
export { IProvidersMetadataCollector } from './core/provider/IProvidersMetadataCollector';
export { ProvidersMetadataCollector } from './core/provider/ProvidersMetadataCollector';
export { IDisposable } from './core/utils/types';
export { ProviderKey } from './core/provider/IProvider';
export { isProviderKey } from './core/provider/IProvider';
export { createTagsDecorator } from './providers/TaggedProvider';
export { createSingletonDecorator } from './providers/SingletonProvider';
export { createAddKeyDecorator } from './core/provider/Provider';

const providerMetadataCollector = ProvidersMetadataCollector.create();
export const forKey = createAddKeyDecorator(providerMetadataCollector);

export const asSingleton = createSingletonDecorator(providerMetadataCollector);
export const perTags = createTagsDecorator(providerMetadataCollector);

export function fromClass<T>(value: constructor<T>): ProviderBuilder<T> {
    return new ProviderBuilder(Provider.fromClass(value)).map(providerMetadataCollector.findReducerOrCreate(value));
}

export function fromValue<T>(value: T): ProviderBuilder<T> {
    return new ProviderBuilder(Provider.fromValue(value));
}

export function fromFn<T>(fn: ResolveDependency<T>): ProviderBuilder<T> {
    return new ProviderBuilder(new Provider(fn));
}

export { createMethodHookDecorator } from './hooks/IMethodsMetadataCollector';

export const by =
    <T>(key: InjectionToken<T>, ...args: unknown[]) =>
    (l: IContainer) =>
        l.resolve<T>(key, ...args);
