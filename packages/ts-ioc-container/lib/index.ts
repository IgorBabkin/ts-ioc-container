// Containers
export {
  IContainer,
  Resolvable,
  IContainerModule,
  isDependencyKey,
  DependencyKey,
  InjectionToken,
  Tag,
  Tagged,
} from './container/IContainer';
export { Container } from './container/Container';
export { EmptyContainer } from './container/EmptyContainer';
export { AutoMockedContainer } from './container/AutoMockedContainer';

// Injectors
export { IInjector } from './injector/IInjector';
export { MetadataInjector, inject, resolveArgs, getInjectFns, InjectFn } from './injector/MetadataInjector';
export { SimpleInjector } from './injector/SimpleInjector';
export { ProxyInjector } from './injector/ProxyInjector';

// Providers
export {
  ResolveDependency,
  IProvider,
  provider,
  visible,
  alias,
  argsFn,
  args,
  ArgsFn,
  ProviderDecorator,
  InstantDependencyOptions,
  ProviderResolveOptions,
} from './provider/IProvider';
export { Provider } from './provider/Provider';
export { singleton, SingletonProvider } from './provider/singleton/SingletonProvider';
export { MultiCache, multiCache } from './provider/singleton/MultiCache';
export { Cache } from './provider/singleton/Cache';
export { decorate, DecorateFn } from './provider/DecoratorProvider';

// Registrations
export { key, IRegistration, scope, register } from './registration/IRegistration';
export { Registration } from './registration/Registration';

// Errors
export { DependencyNotFoundError } from './errors/DependencyNotFoundError';
export { MethodNotImplementedError } from './errors/MethodNotImplementedError';
export { ContainerDisposedError } from './errors/ContainerDisposedError';

// Others
export { getHooks, hook, hasHooks } from './hook';
export { by, InstancePredicate, IMemo, IMemoKey, byAlias, byAliases } from './by';
export { constructor } from './utils';
export { autorun, startAutorun, AutorunContext, hasAutorunHooks } from './autorun';
export {
  setMetadata,
  getMetadata,
  setParameterMetadata,
  setMethodMetadata,
  getMethodMetadata,
  getParameterMetadata,
} from './metadata';
