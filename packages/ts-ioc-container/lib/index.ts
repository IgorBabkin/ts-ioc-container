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
  type ScopeHook,
  type RegisteredHook,
  type AutoResolveOptions,
  isDependencyKey,
} from './container/IContainer';
export { Container } from './container/Container';
export { AutoResolveModule } from './container/AutoResolveModule';
export { EmptyContainer } from './container/EmptyContainer';

// Injectors
export {
  type IInjector,
  type InjectOptions,
  type IInjectFnResolver,
  type IInjectorModule,
  type InjectorHook,
  Injector,
} from './injector/IInjector';
export { MetadataInjector, inject, arg, args, argsFn, resolveArgs } from './injector/MetadataInjector';
export { SimpleInjector } from './injector/SimpleInjector';
export { ProxyInjector } from './injector/ProxyInjector';

// Providers
export {
  type ResolveDependency,
  type IProvider,
  type DecorateFn,
  type ArgsFn,
  type ProviderOptions,
  type GetCacheKey,
  type ScopeAccessOptions,
  type ScopeAccessRule,
  type ProviderHook,
  type WithNamespace,
} from './provider/IProvider';
export { Provider } from './provider/Provider';

// Registrations
export {
  type IRegistration,
  type ReturnTypeOfRegistration,
  type ScopeMatchRule,
  type ProviderPipe,
  type Bindable,
  type ProviderMapper,
  type RegistrationMapper,
  isProviderPipe,
  registerPipe,
  toBindToken,
  toProviderFn,
  toRegistrationFn,
  register,
  bindTo,
  scope,
  scopeAccess,
  lazy,
  autoResolve,
  singleton,
  decorate,
  appendArgs,
  appendArgsFn,
  onResolve,
  namespace,
} from './registration/IRegistration';
export { Registration } from './registration/Registration';

// Errors
export { ContainerError } from './errors/ContainerError';
export { DependencyNotFoundError } from './errors/DependencyNotFoundError';
export { ContainerNotFoundError } from './errors/ContainerNotFoundError';
export { DependencyMissingKeyError } from './errors/DependencyMissingKeyError';
export { MethodNotImplementedError } from './errors/MethodNotImplementedError';
export { ContainerDisposedError } from './errors/ContainerDisposedError';
export { ProviderDisposedError } from './errors/ProviderDisposedError';
export { CannonSingletonApplyTwiceError } from './errors/CannonSingletonApplyTwiceError';
export { UnsupportedTokenTypeError } from './errors/UnsupportedTokenTypeError';
export { TypedEventDisposedError } from './errors/TypedEventDisposedError';

// Hooks
export {
  getHooks,
  hook,
  hasHooks,
  toHookFn,
  type HookFn,
  type HookClass,
  type HookType,
  type InjectFn,
  type HooksOfClass,
} from './hooks/hook';
export {
  HookContext,
  createHookContextFactory,
  createHookExecutionContext,
  type CreateHookExecutionContext,
  type IHookContext,
} from './hooks/HookContext';
export { injectProp } from './hooks/injectProp';
export { sequential, parallel, oncePerInstance, type ResolvedObjectHook } from './hooks/combinators';
export {
  HookCollector,
  toTask,
  type HookAction,
  type HookCollectionContext,
  type HookCollectorOptions,
  type HookCollectorProps,
  type MapHookExecutionContext,
} from './hooks/HookCollector';

// Tokens
export { InjectionToken } from './token/InjectionToken';
export { type Injectable, toToken, toMappedToken, argToToken } from './token/toToken';
export { GroupAliasToken, toGroupAlias } from './token/GroupAliasToken';
export { SingleAliasToken, toSingleAlias } from './token/SingleAliasToken';
export { ClassToken } from './token/ClassToken';
export { SingleToken } from './token/SingleToken';
export { FunctionToken } from './token/FunctionToken';
export { ConstantToken } from './token/ConstantToken';
export { type InstancePredicate, GroupInstanceToken } from './token/GroupInstanceToken';

// Metadata
export { resolveConstructor } from './metadata/target';
export { addClassMeta, getClassMeta, addClassLabel, getClassLabels, addClassTag, getClassTags } from './metadata/class';
export {
  addParamMeta,
  getParamMeta,
  addParamLabel,
  getParamLabels,
  addParamTag,
  getParamTags,
} from './metadata/parameter';
export {
  addMethodMeta,
  getMethodMeta,
  addMethodLabel,
  getMethodLabels,
  addMethodTag,
  getMethodTags,
} from './metadata/method';
export { handleError, handleAsyncError, type HandleErrorParams } from './utils/errorHandler';
export { runInOrder, runAtOnce, type Task } from './utils/task';
export { throttle } from './utils/throttle';
export { debounce } from './utils/debounce';
export { shallowCache } from './utils/shallowCache';
export { once } from './utils/once';
export { memoize } from './utils/memoize';
export { getConstructorChain } from './utils/getConstructorChain';
export { TypedEvent, type ITypedEvent, type TypedEventListener, type Unsubscribe } from './utils/TypedEvent';

// Execution
export { type ExecutionContext } from './ExecutionContext';

// Utils
export { select } from './select';
export { pipe, type MapFn } from './utils/fp';
export { ProxyRegistry, unwrapProxy, type IProxyRegistry } from './utils/ProxyRegistry';
export { type Branded, type constructor, type Instance, Is } from './utils/basic';
export { glob, matchGlob, type Glob } from './utils/glob';
export {
  joinNamespace,
  matchNamespace,
  normalizeNamespace,
  type Namespace,
  type NamespaceTemplate,
} from './utils/namespace';
