import { IContainer, InjectionToken } from './container/IContainer';
import { ProviderKey, ResolveDependency, Tag } from './provider/IProvider';
import { Provider } from './provider/Provider';
import { RegistrationReflector } from './registration/RegistrationReflector';
import { constructor } from './types';
import { RegistrationBuilder } from './registration/RegistrationBuilder';

export { IContainer, Resolveable } from './container/IContainer';
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
export { isProviderKey } from './provider/IProvider';

export const by =
    <T>(key: InjectionToken<T>, ...args: unknown[]) =>
    (l: IContainer) =>
        l.resolve<T>(key, ...args);

export function fromClass<T>(value: constructor<T>): RegistrationBuilder<T> {
    return new RegistrationBuilder(Provider.fromClass(value)).map(providerReflector.findReducerOrCreate(value));
}

export function fromValue<T>(value: T): RegistrationBuilder<T> {
    return new RegistrationBuilder(Provider.fromValue(value));
}

export function fromFn<T>(fn: ResolveDependency<T>): RegistrationBuilder<T> {
    return new RegistrationBuilder(new Provider(fn));
}

const providerReflector = new RegistrationReflector('registrationMapper');

export const perTags =
    (...tags: Tag[]): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = providerReflector.findReducerOrCreate(targetClass);
        providerReflector.addReducer(targetClass, (builder) => fn(builder).perTags(...tags));
    };
export const asSingleton: ClassDecorator = (target) => {
    const targetClass = target as any as constructor<unknown>;
    const fn = providerReflector.findReducerOrCreate(targetClass);
    providerReflector.addReducer(targetClass, (builder) => fn(builder).asSingleton());
};
export const forKey =
    (key: ProviderKey): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = providerReflector.findReducerOrCreate(targetClass);
        providerReflector.addReducer(targetClass, (builder) => fn(builder).forKey(key));
    };
