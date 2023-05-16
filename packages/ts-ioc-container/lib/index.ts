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
export { Provider, provider } from './provider/Provider';
export { ArgsFn, withArgsFn, withArgs } from './provider/ArgsProvider';
export { SingletonProvider, asSingleton } from './provider/SingletonProvider';
export { TaggedProvider, perTags } from './provider/TaggedProvider';
export { AutoMockedContainer } from './container/AutoMockedContainer';
export { forKey, Registration } from './registration/Registration';
export { DependencyMissingKeyError } from './registration/DependencyMissingKeyError';

export const by =
    <T>(key: InjectionToken<T>, ...args: unknown[]) =>
    (l: IContainer) =>
        l.resolve<T>(key, ...args);
