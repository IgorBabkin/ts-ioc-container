import { ProviderKey, ResolveDependency, Tag } from '../provider/IProvider';
import { ArgsFn } from '../provider/ArgsProvider';
import { RegistrationMissingKeyError } from './RegistrationMissingKeyError';
import { IContainer, IModule } from '../container/IContainer';
import { ProviderBuilder } from '../provider/ProviderBuilder';
import { RegistrationReflector } from './RegistrationReflector';
import { constructor, identity } from '../utils';

const registrationReflector = new RegistrationReflector();

export class Registration implements IModule {
    private key?: ProviderKey;

    static fromClass<T>(Target: constructor<T>): Registration {
        const map = registrationReflector.getMapper(Target) ?? identity;
        return map(new Registration(ProviderBuilder.fromClass(Target)));
    }

    static fromValue<T>(value: T): Registration {
        return new Registration(ProviderBuilder.fromValue(value));
    }

    static fromFn<T>(fn: ResolveDependency<T>): Registration {
        return new Registration(ProviderBuilder.fromFn(fn));
    }

    constructor(private providerBuilder: ProviderBuilder) {}

    withArgs(...extraArgs: unknown[]): this {
        this.providerBuilder = this.providerBuilder.withArgs(...extraArgs);
        return this;
    }

    withArgsFn(argsFn: ArgsFn): this {
        this.providerBuilder = this.providerBuilder.withArgsFn(argsFn);
        return this;
    }

    perTags(...tags: Tag[]): this {
        this.providerBuilder = this.providerBuilder.perTags(...tags);
        return this;
    }

    asSingleton(...tags: Tag[]): this {
        this.providerBuilder = this.providerBuilder.asSingleton(...tags);
        return this;
    }

    forKey(key: ProviderKey): this {
        this.key = key;
        return this;
    }

    applyTo(container: IContainer): void {
        if (!this.key) {
            throw new RegistrationMissingKeyError('Pls provide registration keys for current providerBuilder');
        }
        container.register(this.key, this.providerBuilder.build());
    }
}

export const perTags =
    (...tags: Tag[]): ClassDecorator =>
    (target: any) => {
        registrationReflector.appendMapper(target, (registration) => registration.perTags(...tags));
    };

export const asSingleton =
    (...tags: Tag[]): ClassDecorator =>
    (target: any) => {
        registrationReflector.appendMapper(target, (registration) => registration.asSingleton(...tags));
    };

export const forKey =
    (key: ProviderKey): ClassDecorator =>
    (target: any) => {
        registrationReflector.appendMapper(target, (registration) => registration.forKey(key));
    };
