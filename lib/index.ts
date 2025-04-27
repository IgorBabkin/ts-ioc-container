// Containers
export {
  type IContainer,
  type Resolvable,
  type IContainerModule,
  type DependencyKey,
  type InjectionToken,
  type Tag,
  type Tagged,
  type Instance,
  type ResolveOneOptions,
  type ResolveManyOptions,
} from './container/IContainer';
export { Container } from './container/Container';
export { EmptyContainer } from './container/EmptyContainer';
export { AutoMockedContainer } from './container/AutoMockedContainer';

// Injectors
export { inject, resolveArgs } from './injector/inject';
export { type IInjector, type InjectOptions, type IInjectFnResolver } from './injector/IInjector';
export { MetadataInjector } from './injector/MetadataInjector';
export { SimpleInjector } from './injector/SimpleInjector';
export { ProxyInjector } from './injector/ProxyInjector';

// Providers
export {
  type ResolveDependency,
  type IProvider,
  scopeAccess,
  lazy,
  argsFn,
  args,
  type ArgsFn,
  ProviderDecorator,
  resolveByArgs,
  type IMapper,
  type ProviderOptions,
} from './provider/IProvider';
export { Provider } from './provider/Provider';
export { singleton, SingletonProvider } from './provider/SingletonProvider';
export { type Cache, multiCache, MultiCache } from './provider/Cache';
export { decorate, type DecorateFn } from './provider/DecoratorProvider';
export { type ProviderPipe } from './provider/ProviderPipe';

// Registrations
export {
  asKey,
  asAlias,
  type IRegistration,
  type ReturnTypeOfRegistration,
  scope,
  register,
  type ScopePredicate,
} from './registration/IRegistration';
export { Registration } from './registration/Registration';

// Errors
export { DependencyNotFoundError } from './errors/DependencyNotFoundError';
export { MethodNotImplementedError } from './errors/MethodNotImplementedError';
export { ContainerDisposedError } from './errors/ContainerDisposedError';
export { UnexpectedHookResultError } from './errors/UnexpectedHookResultError';

// Hooks
export {
  getHooks,
  hook,
  hasHooks,
  type HookFn,
  type HookClass,
  runHooks,
  runHooksAsync,
  injectProp,
  onDispose,
  onConstruct,
  runOnConstructHooks,
  runOnDisposeHooks,
} from './hooks/hook';
export { HookContext, type InjectFn, type IHookContext } from './hooks/HookContext';

// Metadata
export {
  setMetadata,
  getMetadata,
  setParameterMetadata,
  setMethodMetadata,
  getMethodMetadata,
  getParameterMetadata,
} from './metadata';

// Others
export { by } from './resolve';
export { type constructor, Is } from './utils';
export { depKey, type DepKey } from './DepKey';
export { type InstancePredicate } from './resolve';
