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
export { inject, resolveArgs } from './injector/inject';
export { IInjector, InjectOptions } from './injector/IInjector';
export { MetadataInjector } from './injector/MetadataInjector';
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
  ProviderResolveOptions,
} from './provider/IProvider';
export { Provider } from './provider/Provider';
export { singleton, SingletonProvider } from './provider/singleton/SingletonProvider';
export { MultiCache, multiCache } from './provider/singleton/MultiCache';
export { Cache } from './provider/singleton/Cache';
export { decorate, DecorateFn } from './provider/DecoratorProvider';

// Registrations
export {
  key,
  IRegistration,
  ReturnTypeOfRegistration,
  scope,
  register,
  redirectFrom,
} from './registration/IRegistration';
export { Registration } from './registration/Registration';

// Errors
export { DependencyNotFoundError } from './errors/DependencyNotFoundError';
export { MethodNotImplementedError } from './errors/MethodNotImplementedError';
export { ContainerDisposedError } from './errors/ContainerDisposedError';

// Hooks
export { getHooks, hook, hasHooks, HookFn, HookClass, runHooks, runHooksAsync, injectProp } from './hooks/hook';
export { HookContext, InjectFn, IHookContext } from './hooks/HookContext';

// Others
export { by, InstancePredicate, IMemo, IMemoKey, byAlias, byAliases, depKey, DepKey } from './by';
export { constructor } from './utils';
export {
  setMetadata,
  getMetadata,
  setParameterMetadata,
  setMethodMetadata,
  getMethodMetadata,
  getParameterMetadata,
} from './metadata';
