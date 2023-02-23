import { createAddKeyDecorator, Provider } from './core/provider/Provider';
import { ProviderReflector } from './core/provider/ProviderReflector';
import { createSingletonDecorator } from './providers/SingletonProvider';
import { createTagsDecorator } from './providers/TaggedProvider';
import { constructor } from './core/utils/types';
import { ProviderBuilder } from './providers/ProviderBuilder';
import { ResolveDependency } from './core/provider/IProvider';
import { IContainer, InjectionToken } from './core/container/IContainer';

export { ContainerHook } from './hooks/ContainerHook';
export { ProviderReducer } from './core/provider/IProviderReflector';
export { IContainer, Resolveable } from './core/container/IContainer';
export { constructor } from './core/utils/types';
export { Container } from './core/container/Container';
export { ScopeOptions, ResolveDependency, Tag, IProvider } from './core/provider/IProvider';
export { IInjector } from './core/IInjector';
export { SimpleInjector } from './injectors/SimpleInjector';
export { IMethodReflector } from './hooks/IMethodReflector';
export { MethodReflector } from './hooks/MethodReflector';
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
export { IProviderReflector } from './core/provider/IProviderReflector';
export { ProviderReflector } from './core/provider/ProviderReflector';
export { IDisposable } from './core/utils/types';
export { ProviderKey } from './core/provider/IProvider';
export { isProviderKey } from './core/provider/IProvider';
export { createTagsDecorator } from './providers/TaggedProvider';
export { createSingletonDecorator } from './providers/SingletonProvider';
export { createAddKeyDecorator } from './core/provider/Provider';

const providerReflector = ProviderReflector.create();
export const forKey = createAddKeyDecorator(providerReflector);

export const asSingleton = createSingletonDecorator(providerReflector);
export const perTags = createTagsDecorator(providerReflector);

export function fromClass<T>(value: constructor<T>): ProviderBuilder<T> {
    return new ProviderBuilder(Provider.fromClass(value)).map(providerReflector.findReducerOrCreate(value));
}

export function fromValue<T>(value: T): ProviderBuilder<T> {
    return new ProviderBuilder(Provider.fromValue(value));
}

export function fromFn<T>(fn: ResolveDependency<T>): ProviderBuilder<T> {
    return new ProviderBuilder(new Provider(fn));
}

export { createMethodHookDecorator } from './hooks/IMethodReflector';

export const by =
    <T>(key: InjectionToken<T>, ...args: unknown[]) =>
    (l: IContainer) =>
        l.resolve<T>(key, ...args);
