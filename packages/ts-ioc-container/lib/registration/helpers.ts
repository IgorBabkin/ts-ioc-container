import { RegistrationReflector } from './RegistrationReflector';
import { Registration } from './Registration';
import { constructor, pipe } from '../utils';
import { ProviderBuilder } from '../provider/ProviderBuilder';
import { ProviderKey, ResolveDependency, Tag } from '../provider/IProvider';

const registrationReflector = new RegistrationReflector();

export function fromClass<T>(Target: constructor<T>): Registration {
    const map = registrationReflector.getMapper(Target);
    return map(new Registration(ProviderBuilder.fromClass(Target)));
}

export function fromValue<T>(value: T): Registration {
    return new Registration(ProviderBuilder.fromValue(value));
}

export function fromFn<T>(fn: ResolveDependency<T>): Registration {
    return new Registration(ProviderBuilder.fromFn(fn));
}

export const perTags =
    (...tags: Tag[]): ClassDecorator =>
    (target: any) => {
        const targetClass: constructor<unknown> = target;
        registrationReflector.setMapper(
            targetClass,
            pipe(registrationReflector.getMapper(targetClass), (registration) => registration.perTags(...tags)),
        );
    };

export const asSingleton =
    (...tags: Tag[]): ClassDecorator =>
    (target: any) => {
        const targetClass: constructor<unknown> = target;
        registrationReflector.setMapper(
            targetClass,
            pipe(registrationReflector.getMapper(targetClass), (registration) => registration.asSingleton(...tags)),
        );
    };

export const forKey =
    (key: ProviderKey): ClassDecorator =>
    (target: any) => {
        const targetClass: constructor<unknown> = target;
        registrationReflector.setMapper(
            targetClass,
            pipe(registrationReflector.getMapper(targetClass), (registration) => registration.forKey(key)),
        );
    };
