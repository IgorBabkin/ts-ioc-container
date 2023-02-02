import { createAddKeyDecorator, Provider } from './core/provider/Provider';
import { ProvidersMetadataCollector } from './core/provider/ProvidersMetadataCollector';
import { createSingletonDecorator } from './features/providers/SingletonProvider';
import { createTagsDecorator } from './features/providers/TaggedProvider';
import { constructor } from './core/utils/types';
import { ProviderBuilder } from './features/providers/ProviderBuilder';
import { ResolveDependency } from './core/provider/IProvider';

export { ProviderReducer } from './core/provider/IProvidersMetadataCollector';
export { IContainer, Resolveable } from './core/container/IContainer';
export { constructor } from './core/utils/types';
export { Container } from './core/container/Container';
export { ScopeOptions, ResolveDependency, Tag, IProvider } from './core/provider/IProvider';
export { IInjector } from './core/IInjector';
export { SimpleInjector } from './features/injectors/SimpleInjector';
export { IMethodsMetadataCollector } from './features/hooks/IMethodsMetadataCollector';
export { MethodsMetadataCollector } from './features/hooks/MethodsMetadataCollector';
export { InjectionToken } from './core/container/IContainer';
export { ProviderNotFoundError } from './core/provider/ProviderNotFoundError';
export { MethodNotImplementedError } from './core/utils/MethodNotImplementedError';
export { ContainerDisposedError } from './core/container/ContainerDisposedError';
export { Provider } from './core/provider/Provider';
export { ArgsProvider, ArgsFn, createArgsFnDecorator } from './features/providers/ArgsProvider';
export { IContainerHook } from './core/container/IContainerHook';
export { TaggedProvider } from './features/providers/TaggedProvider';
export { ProxyInjector } from './features/injectors/ProxyInjector';
export { LevelProvider, createLevelDecorator } from './features/providers/LevelProvider';
export { IMockRepository } from './features/automock/IMockRepository';
export { AutoMockedContainer } from './features/automock/AutoMockedContainer';
export { SingletonProvider } from './features/providers/SingletonProvider';
export { ProviderBuilder } from './features/providers/ProviderBuilder';
export { IProvidersMetadataCollector } from './core/provider/IProvidersMetadataCollector';
export { ProvidersMetadataCollector } from './core/provider/ProvidersMetadataCollector';
export { IDisposable } from './core/utils/types';
export { ProviderKey } from './core/provider/IProvider';
export { isProviderKey } from './core/provider/IProvider';
export { createTagsDecorator } from './features/providers/TaggedProvider';
export { createSingletonDecorator } from './features/providers/SingletonProvider';
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

export function fromClassArray<T>(classes: constructor<T>[]): ProviderBuilder<T[]> {
    return fromFn((l) => classes.map((it) => l.resolve(it)));
}
export { createMethodHookDecorator } from './features/hooks/IMethodsMetadataCollector';
