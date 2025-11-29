// Containers
export {
  type IContainer,
  type Resolvable,
  type IContainerModule,
  type DependencyKey,
  type Tag,
  type Tagged,
  type ResolveOneOptions,
  type ResolveManyOptions,
  isDependencyKey,
} from './container/IContainer';
export { Container } from './container/Container';
export { EmptyContainer } from './container/EmptyContainer';

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
  type IRegistration,
  type ReturnTypeOfRegistration,
  scope,
  register,
  type ScopePredicate,
  bindTo,
} from './registration/IRegistration';
export { Registration } from './registration/Registration';

// Errors
export { DependencyNotFoundError } from './errors/DependencyNotFoundError';
export { DependencyMissingKeyError } from './errors/DependencyMissingKeyError';
export { MethodNotImplementedError } from './errors/MethodNotImplementedError';
export { ContainerDisposedError } from './errors/ContainerDisposedError';
export { UnexpectedHookResultError } from './errors/UnexpectedHookResultError';

// Hooks
export { getHooks, hook, hasHooks, type HookFn, type HookClass } from './hooks/hook';
export { HookContext, type IHookContext } from './hooks/HookContext';
export { injectProp } from './hooks/injectProp';
export { onConstructHooksRunner, onConstruct } from './hooks/onConstruct';
export { onDisposeHooksRunner, onDispose } from './hooks/onDispose';

// Hooks runner
export type { HooksRunnerContext } from './hooks/HooksRunner';
export { HooksRunner } from './hooks/HooksRunner';

// Metadata
export {
  setClassMetadata,
  getClassMetadata,
  setParameterMetadata,
  setMethodMetadata,
  getMethodMetadata,
  getParameterMetadata,
} from './metadata';

// InjectionToken
export { InjectionToken } from './token/InjectionToken';
export { GroupAliasToken, toGroupAlias } from './token/GroupAliasToken';
export { SingleAliasToken, toSingleAlias } from './token/SingleAliasToken';
export { ClassToken } from './token/ClassToken';
export { SingleToken } from './token/SingleToken';
export { FunctionToken } from './token/FunctionToken';
export { ConstantToken } from './token/ConstantToken';
export { type InstancePredicate, GroupInstanceToken } from './token/GroupInstanceToken';

// Others
export { select } from './select';
export { Is } from './utils';
export type { InjectFn } from './hooks/hook';
export type { Instance, constructor } from './types';
