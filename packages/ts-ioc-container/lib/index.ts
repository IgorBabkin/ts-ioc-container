import { IContainer, InjectionToken } from './container/IContainer';
import { ProviderKey, ResolveDependency, Tag } from './provider/IProvider';
import { Provider } from './provider/Provider';
import { RegistrationReflector } from './registration/RegistrationReflector';
import { constructor, identity } from './utils';
import { RegistrationBuilder } from './registration/RegistrationBuilder';

export { IContainer, Resolvable } from './container/IContainer';
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
export { isProviderKey } from './provider/IProvider';

const providerReflector = new RegistrationReflector();

export const by =
    <T>(key: InjectionToken<T>, ...args: unknown[]) =>
    (l: IContainer) =>
        l.resolve<T>(key, ...args);

export function fromClass<T>(Target: constructor<T>): RegistrationBuilder<T> {
    const map = providerReflector.getMapper(Target) ?? identity;
    return map(new RegistrationBuilder(Provider.fromClass(Target)));
}

export function fromValue<T>(value: T): RegistrationBuilder<T> {
    return new RegistrationBuilder(Provider.fromValue(value));
}

export function fromFn<T>(fn: ResolveDependency<T>): RegistrationBuilder<T> {
    return new RegistrationBuilder(new Provider(fn));
}

export const perTags =
    (...tags: Tag[]): ClassDecorator =>
    (target: any) => {
        providerReflector.appendMapper(target, (builder) => builder.perTags(...tags));
    };

export const asSingleton =
    (...tags: Tag[]): ClassDecorator =>
    (target: any) => {
        providerReflector.appendMapper(target, (builder) => builder.asSingleton(...tags));
    };

export const forKey =
    (key: ProviderKey): ClassDecorator =>
    (target: any) => {
        providerReflector.appendMapper(target, (builder) => builder.forKey(key));
    };
