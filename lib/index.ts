import { HookedProvider } from './features/instanceHook/HookedProvider';
import { HookServiceLocator } from './features/HookServiceLocator';
import { HookedInjector } from './features/instanceHook/HookedInjector';

export { IMockProviderStorage } from './features/mock/IMockProviderStorage';
export { MockProvider } from './features/mock/MockProvider';
export { MockProviderStorage } from './features/mock/MockProviderStorage';
export { VendorMockProviderStorage } from './features/mock/VendorMockProviderStorage';
export { IServiceLocator } from './core/IServiceLocator';
export { constructor } from './helpers/types';
export { ServiceLocator } from './core/ServiceLocator';
export { ProviderKey, IProvider, ResolveDependency } from './core/providers/IProvider';
export { IInjector } from './core/IInjector';
export { SimpleInjector } from './features/SimpleInjector';
export { IocInjector } from './features/ioc/IocInjector';
export { IInjectMetadataCollector } from './features/ioc/IInjectMetadataCollector';
export { IMethodsMetadataCollector } from './decorators/instanceHook/IMethodsMetadataCollector';
export { MethodsMetadataCollector } from './decorators/instanceHook/MethodsMetadataCollector';
export { createHookDecorator } from './decorators/instanceHook/decorators';
export { createInjectDecorator, createInjectFnDecorator } from './decorators/ioc/decorators';
export { InjectMetadataCollector } from './decorators/ioc/InjectMetadataCollector';
export { InjectionToken } from './core/IServiceLocator';
export { ProviderNotFoundError } from './errors/ProviderNotFoundError';
export { MethodNotImplementedError } from './errors/MethodNotImplementedError';
export { IProviderRepository } from './core/IProviderRepository';
export { HookedProvider } from './features/instanceHook/HookedProvider';
export { InjectFn } from './features/ioc/InjectFn';
export { IInstanceHook } from './features/instanceHook/IInstanceHook';
export { ProviderRepository } from './core/ProviderRepository';
export { Provider } from './core/providers/Provider';
export { HookedInjector } from './features/instanceHook/HookedInjector';
export { IDisposable } from './helpers/IDisposable';
export { MockedRepository } from './features/mock/MockedRepository';
export { ScopedProvider } from './core/providers/ScopedProvider';
export { SingletonProvider } from './core/providers/SingletonProvider';
export { ProviderBuilder } from './features/ProviderBuilder';
export { HookServiceLocator } from './features/HookServiceLocator';
export { HookedProviderRepository } from './features/HookedProviderRepository';

/**
 * @deprecated Use HookedProvider
 */
export const InstanceHookProvider = HookedProvider;
/**
 * @deprecated Use HookedInjector
 */
export const InstanceHookInjector = HookedInjector;
