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
export { inject, resolveArgs, args, argsFn } from './injector/inject';
export { type IInjector, type InjectOptions, type IInjectFnResolver, Injector } from './injector/IInjector';
export { MetadataInjector } from './injector/MetadataInjector';
export { SimpleInjector } from './injector/SimpleInjector';
export { ProxyInjector } from './injector/ProxyInjector';

// Providers
export {
  type ResolveDependency,
  type IProvider,
  scopeAccess,
  lazy,
  addArgs,
  addArgsFn,
  setArgsFn,
  setArgs,
  type ArgsFn,
  ProviderDecorator,
  type IMapper,
  type ProviderOptions,
} from './provider/IProvider';
export { Provider } from './provider/Provider';
export { singleton, SingletonProvider } from './provider/SingletonProvider';
export { decorate, type DecorateFn } from './provider/DecoratorProvider';
export { type ProviderPipe } from './provider/ProviderPipe';

// Registrations
export {
  type IRegistration,
  type ReturnTypeOfRegistration,
  scope,
  register,
  type ScopeMatchRule,
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
export { getHooks, hook, hasHooks, type HookFn, type HookClass, type InjectFn, type HooksOfClass } from './hooks/hook';
export { HookContext, createHookContextFactory, createHookContext, type IHookContext } from './hooks/HookContext';
export { injectProp } from './hooks/injectProp';
export { onConstructHooksRunner, onConstruct, AddOnConstructHookModule } from './hooks/onConstruct';
export { onDisposeHooksRunner, onDispose, AddOnDisposeHookModule } from './hooks/onDispose';
export { HooksRunner, type HooksRunnerContext } from './hooks/HooksRunner';

// Tokens
export { InjectionToken } from './token/InjectionToken';
export { GroupAliasToken, toGroupAlias } from './token/GroupAliasToken';
export { SingleAliasToken, toSingleAlias } from './token/SingleAliasToken';
export { ClassToken } from './token/ClassToken';
export { SingleToken } from './token/SingleToken';
export { FunctionToken } from './token/FunctionToken';
export { ConstantToken } from './token/ConstantToken';
export { type InstancePredicate, GroupInstanceToken } from './token/GroupInstanceToken';

// Metadata
export { classMeta, getClassMeta, classLabel, getClassLabels, classTag, getClassTags } from './metadata/class';
export { paramMeta, getParamMeta, paramLabel, getParamLabels, paramTag, getParamTags } from './metadata/parameter';
export { methodMeta, getMethodMeta, methodLabel, getMethodLabels, methodTag, getMethodTags } from './metadata/method';
export { handleError, handleAsyncError, type HandleErrorParams } from './utils/errorHandler';
export { throttle } from './utils/throttle';
export { debounce } from './utils/debounce';
export { shallowCache } from './utils/shallowCache';
export { once } from './utils/once';

// Utils
export { select } from './select';
export { pipe, type MapFn } from './utils/fp';
export { type constructor, type Instance, Is, resolveConstructor } from './utils/basic';
