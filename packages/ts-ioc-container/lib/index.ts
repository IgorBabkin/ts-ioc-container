import { IContainer, InjectionToken } from './container/IContainer';
import { ProviderKey, ResolveDependency, Tag } from './provider/IProvider';
import { RegistrationReflector } from './registration/RegistrationReflector';
import { constructor } from './types';
import { Registration } from './registration/Registration';
import { ProviderBuilder } from './provider/ProviderBuilder';

export { IContainer, Resolvable } from './container/IContainer';
export { EmptyContainer } from './container/EmptyContainer';
export { constructor } from './types';
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
export { ProviderBuilder } from './provider/ProviderBuilder';
export { isProviderKey } from './provider/IProvider';

const registrationReflector = new RegistrationReflector();

export const by =
    <T>(key: InjectionToken<T>, ...args: unknown[]) =>
    (l: IContainer) =>
        l.resolve<T>(key, ...args);

export function fromClass<T>(Target: constructor<T>): Registration {
    return new Registration(ProviderBuilder.fromClass(Target)).map(registrationReflector.findReducer(Target));
}

export function fromValue<T>(value: T): Registration {
    return new Registration(ProviderBuilder.fromValue(value));
}

export function fromFn<T>(fn: ResolveDependency<T>): Registration {
    return new Registration(ProviderBuilder.fromFn(fn));
}

export const perTags =
    (...tags: Tag[]): ClassDecorator =>
    (target) => {
        const targetClass: constructor<unknown> = target as any;
        const fn = registrationReflector.findReducer(targetClass);
        registrationReflector.addReducer(targetClass, (builder) => fn(builder).perTags(...tags));
    };

export const asSingleton =
    (...tags: Tag[]): ClassDecorator =>
    (target) => {
        const targetClass: constructor<unknown> = target as any;
        const fn = registrationReflector.findReducer(targetClass);
        registrationReflector.addReducer(targetClass, (builder) => fn(builder).asSingleton(...tags));
    };

export const forKey =
    (key: ProviderKey): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = registrationReflector.findReducer(targetClass);
        registrationReflector.addReducer(targetClass, (builder) => fn(builder).forKey(key));
    };
