import { IContainer, InjectionToken } from './container/IContainer';

export {
    IContainer,
    Resolvable,
    IContainerModule,
    isDependencyKey,
    DependencyKey,
    InjectionToken,
    Tagged,
    Tag,
} from './container/IContainer';
export { EmptyContainer } from './container/EmptyContainer';
export { constructor } from './utils';
export { Container } from './container/Container';
export { ResolveDependency, IProvider } from './provider/IProvider';
export { IInjector } from './IInjector';
export { DependencyNotFoundError } from './container/DependencyNotFoundError';
export { MethodNotImplementedError } from './container/MethodNotImplementedError';
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
