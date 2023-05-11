import { IContainer, InjectionToken } from './container/IContainer';

export { IContainer, Resolvable, IContainerModule } from './container/IContainer';
export { EmptyContainer } from './container/EmptyContainer';
export { constructor } from './utils';
export { Container } from './container/Container';
export { Tagged, ResolveDependency, Tag, IProvider } from './provider/IProvider';
export { IInjector } from './IInjector';
export { InjectionToken } from './container/IContainer';
export { ProviderNotFoundError } from './provider/ProviderNotFoundError';
export { MethodNotImplementedError } from './MethodNotImplementedError';
export { ContainerDisposedError } from './container/ContainerDisposedError';
export { Provider } from './provider/Provider';
export { ArgsFn } from './provider/ArgsProvider';
export { AutoMockedContainer } from './container/AutoMockedContainer';
export { ProviderKey } from './provider/IProvider';
export { ProviderBuilder, perTags, asSingleton } from './provider/ProviderBuilder';
export { isProviderKey } from './provider/IProvider';
export { forKey, Registration } from './registration/Registration';

export const by =
    <T>(key: InjectionToken<T>, ...args: unknown[]) =>
    (l: IContainer) =>
        l.resolve<T>(key, ...args);
