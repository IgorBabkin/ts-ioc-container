import { IContainer, InjectionToken } from './container/IContainer';

export { IContainer, Resolvable, IContainerModule } from './container/IContainer';
export { EmptyContainer } from './container/EmptyContainer';
export { constructor } from './utils';
export { Container } from './container/Container';
export { ResolveDependency, IProvider } from './provider/IProvider';
export { IInjector } from './IInjector';
export { InjectionToken } from './container/IContainer';
export { ProviderNotFoundError } from './provider/ProviderNotFoundError';
export { MethodNotImplementedError } from './MethodNotImplementedError';
export { ContainerDisposedError } from './container/ContainerDisposedError';
export { Provider } from './provider/Provider';
export { ArgsFn } from './provider/ArgsProvider';
export { AutoMockedContainer } from './container/AutoMockedContainer';
export { ProviderBuilder, perTags, asSingleton } from './provider/ProviderBuilder';
export { forKey, Registration } from './registration/Registration';

export const by =
    <T>(key: InjectionToken<T>, ...args: unknown[]) =>
    (l: IContainer) =>
        l.resolve<T>(key, ...args);
export { isDependencyKey } from './container/IContainer';
export { DependencyKey } from './container/IContainer';
export { Tagged } from './container/IContainer';
export { Tag } from './container/IContainer';
