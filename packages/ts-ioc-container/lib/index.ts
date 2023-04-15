import { IContainer, InjectionToken } from './core/container/IContainer';

export { ProviderReducer } from './core/provider/IProviderReflector';
export { IContainer, Resolveable } from './core/container/IContainer';
export { EmptyContainer } from './core/container/EmptyContainer';
export { constructor } from './core/utils/types';
export { Container } from './core/container/Container';
export { Tagged, ResolveDependency, Tag, IProvider } from './core/provider/IProvider';
export { IInjector } from './core/IInjector';
export { IMethodReflector } from './hooks/IMethodReflector';
export { MethodReflector } from './hooks/MethodReflector';
export { AsyncMethodReflector } from './hooks/AsyncMethodReflector';
export { InjectionToken } from './core/container/IContainer';
export { ProviderNotFoundError } from './core/provider/ProviderNotFoundError';
export { MethodNotImplementedError } from './core/utils/MethodNotImplementedError';
export { ContainerDisposedError } from './core/container/ContainerDisposedError';
export { Provider } from './core/provider/Provider';
export { ArgsProvider, ArgsFn, createArgsFnDecorator } from './providers/ArgsProvider';
export { TaggedProvider } from './providers/TaggedProvider';
export { AutoMockedContainer } from './AutoMockedContainer';
export { SingletonProvider } from './providers/SingletonProvider';
export { fromFn, fromClass, fromValue } from './providers/RegistrationBuilder';
export { IProviderReflector } from './core/provider/IProviderReflector';
export { ProviderReflector } from './core/provider/ProviderReflector';
export { Disposable } from './core/utils/types';
export { ProviderKey } from './core/provider/IProvider';
export { isProviderKey } from './core/provider/IProvider';
export { perTags } from './providers/TaggedProvider';
export { asSingleton } from './providers/SingletonProvider';
export { forKey } from './core/provider/Provider';

export const by =
    <T>(key: InjectionToken<T>, ...args: unknown[]) =>
    (l: IContainer) =>
        l.resolve<T>(key, ...args);
